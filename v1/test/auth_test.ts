import { assert } from "../../deps-test.ts";

const authRequiredUrlList = [
  `users/delete`,
];

// fetch all urls by no Authorization header
authRequiredUrlList.forEach((url) => {
  Deno.test(`${url} nothing Authorization header`, async () => {
    const res = await fetch("http://localhost:8880/v1/" + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    console.log(res.headers);
    const wwwAuthentiate = res.headers.get("WWW-Authenticate");
    assert(wwwAuthentiate !== null);
    assert(wwwAuthentiate.includes(`Bearer realm="token_required`));
    await res.text();
  });
});
