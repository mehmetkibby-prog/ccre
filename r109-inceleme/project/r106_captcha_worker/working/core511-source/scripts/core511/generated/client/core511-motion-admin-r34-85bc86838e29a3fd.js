// r34-work/working/core511-source/scripts/core511/admin-motion-client.mjs
function createMotionAdmin(React) {
  const h = React.createElement;
  return function MotionAdmin() {
    const [settings, setSettings] = React.useState(null), [value, setValue] = React.useState("1.5"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    React.useEffect(() => {
      const abort = new AbortController();
      fetch("/api/admin?core511=motion", { credentials: "same-origin", signal: abort.signal }).then((r) => r.json()).then((body) => {
        if (!abort.signal.aborted) {
          if (!body.ok) throw Error(body.error || body.message || "Ayar okunamad\u0131.");
          setSettings(body.settings);
          setValue(String(body.settings.screenMultiplier));
        }
      }).catch((e) => {
        if (!abort.signal.aborted) setMessage(e.message);
      });
      return () => abort.abort();
    }, []);
    const save = async (e) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true);
      setMessage("");
      try {
        const response = await fetch("/api/admin?core511=motion", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "settings", screenMultiplier: Number(value) }) }), body = await response.json();
        if (!response.ok || !body.ok) throw Error(body.error || body.message || "Ayar kaydedilemedi.");
        setSettings(body.settings);
        setMessage(body.message);
      } catch (e2) {
        setMessage(e2.message);
      } finally {
        setBusy(false);
      }
    };
    return h("section", { className: "admin-card", style: { gridColumn: "1 / -1" } }, h("h2", null, "G\xF6rsel hareket yak\u0131nl\u0131\u011F\u0131"), h("p", null, "Yak\u0131ndaki oyuncular\u0131n hareketi ak\u0131c\u0131 yay\u0131nlan\u0131r. Uzak oyuncular\u0131n normal konum g\xFCncellemeleri s\xFCrer."), h("form", { onSubmit: save }, h("label", null, "Yar\u0131\xE7ap \u2014 ekran k\xF6\u015Fegeni kat\u0131 ", h("input", { type: "number", min: 1.5, max: 6, step: 0.1, value, onChange: (e) => setValue(e.target.value), disabled: busy || !settings, style: { maxWidth: 120 } })), h("button", { type: "submit", disabled: busy || !settings }, busy ? "Kaydediliyor\u2026" : "Kaydet")), h("small", null, "En uzak kamera ayar\u0131 ve ekran boyutu hesaba kat\u0131l\u0131r. G\xF6r\xFCnen alan g\xFCvenlik pay\u0131yla korunur."), settings && !settings.enabled && h("p", null, "G\xF6rsel hareket ak\u0131\u015F\u0131 sunucu ayar\u0131yla kapal\u0131."), message && h("p", { role: "status" }, message));
  };
}
export {
  createMotionAdmin
};
