"""Offline sparse reclamation of SQLite freelist leaves on Linux."""
import ctypes
import os
import sqlite3
import stat
import struct
from contextlib import closing
from pathlib import Path
from storage import require

GIB=1024**3
def inspect_db(path):
    path=Path(path)
    with closing(sqlite3.connect(path.as_uri()+'?mode=ro',uri=True,timeout=2)) as db:
        size=db.execute('PRAGMA page_size').fetchone()[0]
        free=db.execute('PRAGMA freelist_count').fetchone()[0]*size
        total=db.execute('PRAGMA page_count').fetchone()[0]*size
    disk=os.statvfs(path)
    return dict(path=str(path),logicalGiB=round(total/GIB,2),physicalGiB=round(path.stat().st_blocks*512/GIB,2),
                sqliteFreeGiB=round(free/GIB,2),diskFreeGiB=round(disk.f_bavail*disk.f_frsize/GIB,2))

def reclaim(path,expected):
    path=Path(path)
    fd=os.open(path,os.O_RDWR|os.O_NOFOLLOW)
    db=None
    try:
        st=os.fstat(fd)
        require(stat.S_ISREG(st.st_mode) and st.st_nlink==1 and (st.st_dev,st.st_ino)==expected,'Veritabanı kimliği değişti')
        db=sqlite3.connect(path.as_uri()+'?mode=rw',uri=True,isolation_level=None,timeout=3)
        db.execute('PRAGMA locking_mode=EXCLUSIVE')
        # Finish WAL recovery using SQLite itself while the game is stopped.
        busy,frames,done=db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
        require(busy==0 and frames==done,'Başka bir süreç veritabanını kullanıyor')
        db.execute('BEGIN EXCLUSIVE')
        size=db.execute('PRAGMA page_size').fetchone()[0]
        pages=db.execute('PRAGMA page_count').fetchone()[0]
        free=db.execute('PRAGMA freelist_count').fetchone()[0]
        require(db.execute('PRAGMA auto_vacuum').fetchone()[0]==0,'Bu dosya ayrı otomatik sıkıştırma düzeni kullanıyor')
        st=os.fstat(fd); h=os.pread(fd,100,0)
        header_size=int.from_bytes(h[16:18],'big')
        require(os.path.samestat(st,os.stat(path)) and len(h)==100 and h[:16]==b'SQLite format 3\0' and h[20]==0
                and size==(65536 if header_size==1 else header_size) and st.st_size==pages*size
                and int.from_bytes(h[28:32],'big')==pages and pages<2**30,'SQLite sayfa düzeni doğrulanamadı')
        alignment=os.fstatvfs(fd).f_frsize
        first,declared=struct.unpack_from('>II',h,32)
        require(declared==free and free<pages,'Boş sayfa sayısı değişti')
        if free==0:return 0
        require(db.execute('PRAGMA quick_check(1)').fetchone()==('ok',),'SQLite ön denetimi başarısız')
        marks=bytearray(pages+1)
        def mark(n,tag):
            require(1<=n<=pages and not marks[n],'Çakışan veya geçersiz SQLite sayfası')
            marks[n]=tag
        # dbstat independently traverses all live tables, indexes AND overflow pages.
        db.execute('CREATE VIRTUAL TABLE temp.r127_live_pages USING dbstat(main)')
        count=0
        for (n,) in db.execute('SELECT pageno FROM temp.r127_live_pages'):
            mark(n,1);count+=1
        require(marks[1]==1,'Ana şema sayfası doğrulanamadı')
        pending=0x40000000//size+1
        if pending<=pages:mark(pending,1);count+=1
        seen=0
        while first:
            mark(first,2);seen+=1
            buf=os.pread(fd,size,(first-1)*size)
            require(len(buf)==size,'Boş sayfa listesi eksik')
            first,n=struct.unpack_from('>II',buf)
            require(n<=(size-8)//4,'Boş sayfa listesi geçersiz')
            for (leaf,) in struct.iter_unpack('>I',buf[8:8+n*4]):
                mark(leaf,3);seen+=1
        require(seen==free and count+seen==pages,'Dolu ve boş sayfaların tamamı eşleşmedi')
        punch=ctypes.CDLL(None,use_errno=True).fallocate64
        punch.argtypes=(ctypes.c_int,ctypes.c_int,ctypes.c_longlong,ctypes.c_longlong)
        punch.restype=ctypes.c_int
        before=st.st_blocks
        # No path lookup, file truncation, or edits to SQLite metadata. Only
        # whole filesystem blocks strictly inside verified free leaves qualify.
        pos=1
        while (pos:=marks.find(b'\x03',pos))!=-1:
            end=pos+1
            while end<=pages and marks[end]==3:end+=1
            start=((pos-1)*size+alignment-1)//alignment*alignment
            stop=(end-1)*size//alignment*alignment
            if stop>start and punch(fd,3,start,stop-start):
                err=ctypes.get_errno()
                raise OSError(err,os.strerror(err))
            pos=end
        os.fsync(fd)
        require(db.execute('PRAGMA freelist_count').fetchone()==(free,) and db.execute('PRAGMA quick_check(1)').fetchone()==('ok',),'SQLite son denetimi başarısız')
        require(os.fstat(fd).st_size==st.st_size and os.path.samestat(os.stat(path),st),'Dosya kimliği değişti')
        return max(0,(before-os.fstat(fd).st_blocks)*512)
    finally:
        if db is not None:db.close()
        os.close(fd)
