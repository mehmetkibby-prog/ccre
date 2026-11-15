#!/usr/bin/env python3
"""Local HAR check: no credentials, query parameters or personal data printed."""
import argparse,json,sys
from urllib.parse import urlsplit
p=argparse.ArgumentParser();p.add_argument('file');args=p.parse_args()
with open(args.file) as f:data=json.load(f)
entries=data.get('log',{}).get('entries',[]);bad=[];hosts=set()
for e in entries:
 u=urlsplit(e.get('request',{}).get('url',''));hosts.add(u.hostname)
 if u.hostname in ('coreoflife.net','www.coreoflife.net'):bad.append({'scheme':u.scheme,'host':u.hostname,'path':u.path,'status':e.get('response',{}).get('status')})
print(json.dumps({'requestCount':len(entries),'hosts':sorted(h for h in hosts if h),'apexRequests':bad,'pass':bool(entries) and not bad,'scope':'Only the flows recorded in this HAR; capture login, game, voice, video and forum on both devices.'},ensure_ascii=False,indent=2))
sys.exit(0 if entries and not bad else 1)
