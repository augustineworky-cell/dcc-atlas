/* DCC Atlas settings. Safe to edit. The key below is a public (publishable) key. */
window.ATLAS_CONFIG = {
  // Staffly's Supabase project: Atlas signs people in through Staffly's own login.
  stafflyUrl: "https://bpwpxhsdmbkymhpjsfej.supabase.co",
  stafflyKey: "sb_publishable_-CSLD4npu9crafP-Rq7-Ug_IZN2Zh1_",

  // Guest ID for demos and portfolio shows. Only a scrambled (PBKDF2) copy of the password is stored here.
  // "until" switches the guest ID off automatically after that moment.
  guest: { id: "GUEST", name: "Guest", salt: "569ec8d8a3a6186b", iter: 150000, hash: "9720587b0fad67ad3797c1937d48127d82a937837db2f31878f46145be6af8ac", until: "2026-11-24T00:00:00+05:30" },

  // The apps shown on the home screen. status: "live" opens the app, "soon" shows Coming soon.
  // Put each app's web address in "url". An empty url shows a "not set yet" message.
  apps: [
    { id: "staffly", name: "Staffly", desc: "Attendance, leave and payroll for every location.", url: "https://toliflow.vercel.app", status: "live", icon: "pin", tint: "#e4f1ef", color: "#0f766e" },
    { id: "o2d", name: "Order to Dispatch", desc: "From PO to delivery, step by step. Okhla and Gurgaon.", url: "https://dcc-order-to-dispatch.vercel.app", status: "live", icon: "truck", tint: "#fdecef", color: "#c8102e" },
    { id: "ims", name: "IMS GoodsGuru", desc: "Live stock across Okhla, Chattarpur and Gurgaon.", url: "https://dcc-ims.vercel.app", status: "live", icon: "stock", tint: "#fdf0dc", color: "#b45309" },
    { id: "purchase", name: "Purchase FMS", desc: "Purchase orders and follow-ups.", url: "", status: "soon", icon: "cart", tint: "#efefea", color: "#8a8a93" },
    { id: "collections", name: "Collections", desc: "Who owes what, and who to call.", url: "", status: "soon", icon: "wallet", tint: "#efefea", color: "#8a8a93" },
    { id: "brand", name: "Brand portal", desc: "Each brand sees only its own sales.", url: "https://dcc-brandview.vercel.app", status: "live", icon: "chart", tint: "#eee9fb", color: "#7c3aed" }
  ]
};
