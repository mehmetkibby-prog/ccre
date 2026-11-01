// Prepare creature textures before combat, outside the game's animation frame.
const forestTextures = new WeakMap();
const preparing = new WeakSet();
export function forestTexture(image) { return image ? forestTextures.get(image) : undefined; }
export function textureSize(image) {
    return 'naturalWidth' in image ? {width:image.naturalWidth,height:image.naturalHeight} : {width:image.width,height:image.height};
}
export function forestPixels(data, start = 0, end = data.length) {
    for (let i = start; i < end; i += 4) {
        const red=data[i],green=data[i+1],blue=data[i+2];
        // Shift only blue ice; preserve neutral metal, highlights and transparency.
        if (data[i+3] && blue>red+12 && blue>=green*.95) {
            data[i]=Math.min(255,red+(blue-red)*.15);
            data[i+1]=blue;
            data[i+2]=Math.min(blue,red+(green-red)*.45);
        }
    }
}
export function prepareDungeonTexture(image, forest = false) {
    if (preparing.has(image) || typeof document==='undefined' || typeof image.decode!=='function') return;
    preparing.add(image);
    void image.decode().then(()=>{
        // Start after decoding, never from draw(). Work in small strips on phones.
        setTimeout(()=>{
            if (!image.naturalWidth || !image.naturalHeight) return;
            const canvas=document.createElement('canvas');
            canvas.width=forest?image.naturalWidth:1;canvas.height=forest?image.naturalHeight:1;
            const ctx=canvas.getContext('2d',{willReadFrequently:forest});if(!ctx)return;
            ctx.drawImage(image,0,0,canvas.width,canvas.height);
            if(!forest)return;
            let row=0;
            const strip=()=>{
                const height=Math.min(32,canvas.height-row);
                const pixels=ctx.getImageData(0,row,canvas.width,height);
                forestPixels(pixels.data);ctx.putImageData(pixels,0,row);row+=height;
                if(row<canvas.height)setTimeout(strip,0);else forestTextures.set(image,canvas);
            };
            strip();
        },0);
    }).catch(()=>{preparing.delete(image);});
}
