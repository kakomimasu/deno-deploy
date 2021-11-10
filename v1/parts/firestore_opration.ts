import { Core } from "../../deps.ts";

import {
  get,
  getAuth,
  getDatabase,
  initializeApp,
  ref,
  signInWithEmailAndPassword,
} from "../../deps.ts";

const setting = getSetting();
const app = initializeApp(setting.conf);
const auth = getAuth();
const db = getDatabase(app, setting.dbURL);

/** 管理ユーザでログイン */
async function login() {
  if (auth.currentUser) {
    return;
  }

  await signInWithEmailAndPassword(
    auth,
    setting.username,
    setting.password,
  );
}

/** ボードをすべて取得 */
export async function getAllBoards(): Promise<Core.Board[]> {
  await login();
  const boardsRef = ref(db, "boards");
  const snap = await get(boardsRef);
  const boards: Core.Board[] = [];
  snap.forEach((doc: any) => {
    boards.push(createBoard(doc.val()));
  });
  return boards;
}

function createBoard(data: any) {
  const {
    width: w,
    height: h,
    points: points,
    nagent,
    nturn,
    nsec,
    nplayer,
    name,
  } = data;
  const board = new Core.Board({
    w,
    h,
    points,
    nagent,
    nturn,
    nsec,
    nplayer,
    name,
  });
  return board;
}

function getSetting() {
  // 初期化
  const firebaseTest = Deno.env.get("FIREBASE_TEST");
  const username = Deno.env.get("FIREBASE_USERNAME");
  const password = Deno.env.get("FIREBASE_PASSWORD");

  let conf;
  let dbURL;
  if (firebaseTest === "true") {
    conf = {
      apiKey: "AIzaSyCIzvSrMgYAV2SVIPbRMSaHWjsdLDk781A",
      authDomain: "kakomimasu-test.firebaseapp.com",
      projectId: "kakomimasu-test",
      storageBucket: "kakomimasu-test.appspot.com",
      messagingSenderId: "35306968138",
      appId: "1:35306968138:web:513405a81673c8415e42b3",
    };
    dbURL = "https://kakomimasu-test-default-rtdb.firebaseio.com/";
  } else {
    conf = {
      apiKey: "AIzaSyBOas3O1fmIrl51n7I_hC09YCG0EEe7tlc",
      authDomain: "kakomimasu.firebaseapp.com",
      projectId: "kakomimasu",
      storageBucket: "kakomimasu.appspot.com",
      messagingSenderId: "883142143351",
      appId: "1:883142143351:web:dc6ddc1158aa54ada74572",
      measurementId: "G-L43FT511YW",
    };
    dbURL = "https://kakomimasu-default-rtdb.firebaseio.com/";
  }

  return { conf, dbURL, username, password };
}
