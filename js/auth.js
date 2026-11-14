/* Login y guardado en la nube con Firebase (solo corre si config.js está completo) */

if (FB_ON)
  try {
    const V = "10.12.2",
      B = "https://www.gstatic.com/firebasejs/" + V + "/";
    const [{ initializeApp }, A, F] = await Promise.all([
      import(B + "firebase-app.js"),
      import(B + "firebase-auth.js"),
      import(B + "firebase-firestore.js"),
    ]);
    const app = initializeApp(FIREBASE),
      auth = A.getAuth(app),
      db = F.getFirestore(app);
    auth.languageCode = "es";
    let uid = null,
      mode = "in";
    window.fbSave = (s) => (uid ? F.setDoc(F.doc(db, "users", uid), s) : Promise.resolve());
    window.fbOut = () => A.signOut(auth);
    A.onAuthStateChanged(auth, async (u) => {
      if (!u) {
        uid = null;
        appLogout();
        return;
      }
      uid = u.uid;
      let data = null;
      try {
        const sn = await F.getDoc(F.doc(db, "users", u.uid));
        if (sn.exists()) data = sn.data();
      } catch (e) {
        toast("No pude cargar tus datos de la nube", "err");
      }
      appLogin({ uid: u.uid, email: u.email, name: u.displayName || "" }, data);
    });
    const MSG = {
      "auth/invalid-credential": "Email o contraseña incorrectos",
      "auth/wrong-password": "Email o contraseña incorrectos",
      "auth/user-not-found": "No hay una cuenta con ese email",
      "auth/email-already-in-use": "Ya existe una cuenta con ese email",
      "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres",
      "auth/invalid-email": "El email no es válido",
      "auth/too-many-requests": "Demasiados intentos. Esperá un rato",
      "auth/popup-closed-by-user": "",
      "auth/network-request-failed": "Sin conexión a internet",
    };
    const err = (e) => {
      const m = MSG[e.code];
      document.getElementById("aErr").textContent = m === undefined ? "Algo falló, probá de nuevo" : m;
    };
    const setMode = (m) => {
      mode = m;
      document.getElementById("tIn").classList.toggle("on", m === "in");
      document.getElementById("tUp").classList.toggle("on", m === "up");
      document.getElementById("aName").style.display = m === "up" ? "block" : "none";
      document.getElementById("aBtn").textContent = m === "up" ? "Crear cuenta" : "Ingresar";
      document.getElementById("aErr").textContent = "";
    };
    document.getElementById("tIn").onclick = () => setMode("in");
    document.getElementById("tUp").onclick = () => setMode("up");
    document.getElementById("authF").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target,
        b = document.getElementById("aBtn");
      const email = f.email.value.trim(),
        pass = f.pass.value,
        name = f.name.value.trim();
      b.disabled = true;
      b.textContent = "Un momento…";
      try {
        if (mode === "up") {
          const c = await A.createUserWithEmailAndPassword(auth, email, pass);
          if (name) await A.updateProfile(c.user, { displayName: name });
        } else await A.signInWithEmailAndPassword(auth, email, pass);
      } catch (x) {
        err(x);
      }
      b.disabled = false;
      b.textContent = mode === "up" ? "Crear cuenta" : "Ingresar";
    });
    document.getElementById("aGoogle").onclick = () =>
      A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(err);
    document.getElementById("aReset").onclick = async () => {
      const email = document.querySelector("#authF [name=email]").value.trim();
      if (!email) {
        document.getElementById("aErr").textContent = "Escribí tu email arriba y tocá de nuevo";
        return;
      }
      try {
        await A.sendPasswordResetEmail(auth, email);
        toast("Te mandamos un mail para cambiar la contraseña ✉️");
      } catch (x) {
        err(x);
      }
    };
  } catch (e) {
    document.getElementById("authLoad").innerHTML =
      '<p class="bad">No se pudo conectar. Revisá tu internet y recargá la página.</p>';
  }
