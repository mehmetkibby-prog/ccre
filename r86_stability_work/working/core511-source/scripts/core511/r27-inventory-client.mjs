let exchangeOpenR27 = false;
export function chooseEssenceExchange(balance, cost, reward) {
  if (!Number.isSafeInteger(cost)||cost<1||!Number.isSafeInteger(reward)||reward<1)return Promise.resolve(null);
  const available=balance;balance=Math.floor(balance/cost)*cost;
  if (exchangeOpenR27 || !Number.isSafeInteger(balance) || balance < 1 || typeof document === "undefined") return Promise.resolve(null);
  exchangeOpenR27 = true;
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "donation438";
    dialog.setAttribute("aria-labelledby", "donation438-title");
    const add = (tag, text, parent = dialog) => {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      parent.append(node);
      return node;
    };
    const style = add("style");
    style.textContent = ".donation438{box-sizing:border-box;width:min(390px,calc(100vw - 24px));max-height:calc(100dvh - 20px);overflow:auto;padding:22px;border:1px solid #a2ba77;border-radius:18px;background:#102a22;color:#f5efd9;box-shadow:0 20px 70px #0008;font:15px system-ui}.donation438::backdrop{background:#00120c9c}.donation438 h2{margin:0 0 8px;font:700 23px Georgia,serif;color:#eedc9b}.donation438 p{margin:8px 0 16px;color:#b8cec1;line-height:1.4}.donation438 label{display:block}.donation438 input{box-sizing:border-box;width:100%;min-height:46px;margin:8px 0;padding:10px;background:#071c15;border:1px solid #728b63;border-radius:8px;color:#fff;font:20px system-ui}.donation438 button{min-height:42px;border:1px solid #a8a66e;border-radius:8px;padding:8px 14px;background:#183f31;color:#f5efd9;font:600 14px system-ui;touch-action:manipulation}.donation438-actions{display:flex;gap:8px;margin-top:14px}.donation438-actions button{flex:1}.donation438 button[type=submit]{background:#d4b56a;color:#152a1e}.donation438-status{min-height:20px;color:#f7d895;font-size:13px}.donation438 small{display:block;color:#a5c8b4}@media(max-height:430px){.donation438{padding:14px}.donation438 p{margin:5px 0 8px}.donation438-actions{margin-top:8px}}";
    add("h2", "Yaşam Özü Takas Et").id = "donation438-title";
    add("p", "Ne kadar Öz takas etmek istersin?");
    const form = add("form");
    const label = add("label", "Takas edilecek Öz miktarı", form);
    const input = add("input", "", label);
    Object.assign(input, { type: "number", inputMode: "numeric", min: String(cost), max: String(balance), step: String(cost), value: String(cost), required: true });
    input.setAttribute("aria-describedby", "donation438-balance");
    add("small", "Elindeki \xF6z: " + available.toLocaleString("tr-TR")+" · "+cost+" Öz = "+reward+" Mücevher", form).id = "donation438-balance";
    const all = add("button", "T\xFCm\xFCn\xFC se\xE7", form);
    all.type = "button";
    const status = add("div", "", form);
    status.className = "donation438-status";
    status.setAttribute("role", "status");
    const actions = add("div", "", form);
    actions.className = "donation438-actions";
    const cancel = add("button", "Vazge\xE7", actions);
    cancel.type = "button";
    const submit = add("button", "Takas et", actions);
    submit.type = "submit";
    let confirmedAmount = null, settled = false;
    const cancelEvents = ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"];
    const cancelForSession = () => finish(null);
    const finish = (amount) => {
      if (settled) return;
      settled = true;
      if (typeof window !== "undefined") for (const name of cancelEvents) window.removeEventListener(name, cancelForSession);
      dialog.remove();
      exchangeOpenR27 = false;
      resolve(amount);
    };
    if (typeof window !== "undefined") for (const name of cancelEvents) window.addEventListener(name, cancelForSession);
    const change = () => {
      confirmedAmount = null;
      status.textContent = "";
      const amount = Number(input.value);
      submit.textContent = Number.isSafeInteger(amount) && amount >= cost && amount<=balance && amount%cost===0 ? amount.toLocaleString("tr-TR") + " Öz → "+(amount/cost*reward).toLocaleString("tr-TR")+" Mücevher" : "Takas Et";
    };
    input.addEventListener("input", change);
    all.addEventListener("click", () => {
      input.value = String(balance);
      change();
    });
    cancel.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.addEventListener("close", () => finish(null));
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const amount = Number(input.value);
      if (!Number.isSafeInteger(amount) || amount < cost || amount > balance || amount%cost!==0) {
        status.textContent = cost+" ile "+balance+" arasında, "+cost+" sayısının katı olan bir miktar gir.";
        return;
      }
      if ((amount === balance && balance > 1 || amount >= 100) && confirmedAmount !== amount) {
        confirmedAmount = amount;
        status.textContent = amount === balance ? "Seçilen Öz takas edilecek. Onaylamak için tekrar dokun." : amount.toLocaleString("tr-TR") + " Öz takas edeceksin. Onaylamak için tekrar dokun.";
        submit.textContent = "Onayla \xB7 " + amount.toLocaleString("tr-TR") + " \xD6z";
        return;
      }
      finish(amount);
    });
    change();
    document.body.append(dialog);
    try {
      dialog.showModal();
    } catch {
      finish(null);
    }
  });
}
