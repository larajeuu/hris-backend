const res = pm.response.json();
const body = res.data || res; // jaga-jaga kalau responsmu dibungkus "data"
pm.collectionVariables.set("access_token", body.access_token);
pm.collectionVariables.set("refresh_token", body.refresh_token);