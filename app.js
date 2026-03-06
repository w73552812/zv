import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjpnPfD8dAs1EOnH8W0IWzqDiNAGS7yIA",
  authDomain: "zv-social.firebaseapp.com",
  projectId: "zv-social",
  storageBucket: "zv-social.firebasestorage.app",
  messagingSenderId: "228630589056",
  appId: "1:228630589056:web:36709b7a51fe906d3d0065"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Основная функция инициализации
const init = () => {
  // --- ЭЛЕМЕНТЫ ---
  const loginBtn = document.getElementById('loginBtn');
  const regBtn = document.getElementById('regBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const submitBtn = document.getElementById('submitBtn');

  // --- АВТОРИЗАЦИЯ (ПРИВЯЗКА СОБЫТИЙ) ---
  if (loginBtn) loginBtn.onclick = () => handleAuth('login');
  if (regBtn) regBtn.onclick = () => handleAuth('register');
  if (logoutBtn) logoutBtn.onclick = () => signOut(auth);

  async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
      if (type === 'register') await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { alert(e.message); }
  }

  // Наблюдение за состоянием пользователя
  onAuthStateChanged(auth, (user) => {
    const authBlock = document.getElementById('authBlock');
    const createBlock = document.getElementById('createPostBlock');
    if (user) {
      authBlock?.classList.add('hidden');
      createBlock?.classList.remove('hidden');
      document.getElementById('userHeader').innerText = user.email;
    } else {
      authBlock?.classList.remove('hidden');
      createBlock?.classList.add('hidden');
    }
  });

  // --- ЛЕНТА ---
  const feed = document.getElementById('feed');
  onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snapshot) => {
    if (!feed) return;
    feed.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const id = docSnap.id;
      const postEl = document.createElement('div');
      postEl.className = 'card';
      postEl.innerHTML = `
        <strong>${post.authorEmail}</strong>
        <p>${post.text}</p>
        <button class="btn" id="like-${id}">❤️ ${post.likes || 0}</button>
        <button class="btn btn-danger" id="del-${id}">🗑</button>
      `;
      feed.appendChild(postEl);

      // Привязываем кнопки внутри поста вручную
      document.getElementById(`like-${id}`).onclick = () => react(id);
      document.getElementById(`del-${id}`).onclick = () => deletePost(id);
    });
  });

  async function react(id) {
    const r = doc(db, "posts", id);
    const s = await getDoc(r);
    await updateDoc(r, { likes: (s.data().likes || 0) + 1 });
  }

  async function deletePost(id) {
    if (confirm("Удалить?")) await deleteDoc(doc(db, "posts", id));
  }

  // --- ПУБЛИКАЦИЯ ---
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const text = document.getElementById('postText').value;
      if (!text) return;
      await addDoc(collection(db, "posts"), {
        text,
        authorEmail: auth.currentUser.email,
        likes: 0,
        createdAt: serverTimestamp()
      });
      document.getElementById('postText').value = '';
    };
  }
};

// ЗАПУСК ПОСЛЕ ЗАГРУЗКИ DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
