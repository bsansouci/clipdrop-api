import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import * as firebase from "firebase/app";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, getDoc, doc } from "firebase/firestore/lite";
// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6cfZFPraybh6ziyKIMO-afl11alZNlTI",
  projectId: "arcopypaste",
  storageBucket: "clipdrop-async-tasks-client-files",
};

const app = firebase.initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  await signInAnonymously(auth);

  let fileStream = fs.createReadStream(process.argv[2]);
  const formData = new FormData();
  formData.append("image_file", fileStream, { filename: "blob" });
  formData.append("prompt", process.argv.slice(3).join(" "));

  let res = await fetch(
    "https://api.clipdrop.co/sketch-to-image/v1/queued-sketch-to-image",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + auth.currentUser.accessToken,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        Origin: "https://clipdrop.co",
        Referer: "https://clipdrop.co/",
      },
      body: formData,
    }
  );
  if (res.status !== 200) {
    console.error(res, await res.text());
    return;
  }
  let json = await res.json();

  let loop = async () => {
    let _data = await getDoc(
      doc(db, "bufferedTasks", "clients", "tasks", json.documentId)
    );
    let data = _data.data();
    console.log(data.status);
    if (data.status === "completed") {
      let storage = getStorage(app);
      let storageRef = ref(storage, `${data.outputs.generatedImage.storageId}`);
      let url = await getDownloadURL(storageRef);
      console.log("Done: ", url);
    } else if (data.status === "failed") {
      console.error("failed", data);
    } else {
      setTimeout(loop, 1000);
    }
  };

  loop();
}

main();
