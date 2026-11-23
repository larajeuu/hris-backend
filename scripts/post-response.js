const res = pm.response.json();
console.log("STATUS:", pm.response.code);

const body = res.data || res;
const token = body.access_token || body.token;
console.log("TOKEN DITEMUKAN:", !!token);

if (token) {
  pm.environment.set("access_token", token);
}
if (body.refresh_token) {
  pm.environment.set("refresh_token", body.refresh_token);
}