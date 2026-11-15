// Scoped to the depot. Fixed-height mobile sheets must not shrink the page
// controls to their padding or bury them below the gem-bank form.
export const DEPOT_STYLE_R120=`
.market-sheet.storage-sheet{box-sizing:border-box;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;overflow-x:hidden!important;overflow-y:auto!important;scroll-padding-top:74px}
.storage-sheet>*{flex-shrink:0;min-width:0;max-width:100%;box-sizing:border-box}
.storage-sheet>.storage-pages{position:sticky;top:0;z-index:4;display:flex;flex-wrap:wrap;gap:6px;overflow:visible;flex:none;padding:8px 0;margin:0;background:#111a13;border-bottom:1px solid #665b3e}
.storage-sheet>.storage-pages button{flex:0 1 auto;min-height:44px!important;min-width:96px;max-width:100%;padding:7px 10px!important;white-space:normal;font-size:12px!important;touch-action:manipulation}
.storage-sheet>.storage-pages button small{font-size:11px;white-space:nowrap}
.storage-sheet>.storage-pages button:focus-visible{outline:2px solid #f0d28d;outline-offset:2px}
.storage-sheet>.storage-help{font-size:12px;line-height:1.4;margin:5px 0}
.storage-sheet>.storage-feedback:empty{display:none}
.storage-sheet>.storage-section{scroll-margin-top:80px}
@media(max-width:480px){.storage-sheet>.storage-pages{gap:4px}.storage-sheet>.storage-pages button{flex:1 1 calc(33.333% - 4px);min-width:84px;display:flex;flex-direction:column;gap:2px}}
`;
