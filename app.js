import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

// --- 1. АВТОРИЗАЦИЯ И ПРОФИЛЬ ---
onAuthStateChanged(auth, (user) => {
  const authBlock = document.getElementById('authBlock');
  const createPostBlock = document.getElementById('createPostBlock');
  const profileBlock = document.getElementById('profileBlock');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    authBlock.classList.add('hidden');
    createPostBlock.classList.remove('hidden');
    profileBlock.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    
    document.getElementById('userHeader').innerText = `Привет, ${user.displayName || user.email}`;
    document.getElementById('myName').innerText = user.displayName || "Без имени";
    document.getElementById('myAvatar').src = user.photoURL || "https://via.placeholder.com/50";
  } else {
    authBlock.classList.remove('hidden');
    createPostBlock.classList.add('hidden');
    profileBlock.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    document.getElementById('userHeader').innerText = "Войдите в ZV";
  }
});

window.authAction = async (type) => {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  try {
    if (type === 'register') await createUserWithEmailAndPassword(auth, email, pass);
    else await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { alert(e.message); }
};

document.getElementById('logoutBtn').onclick = () => signOut(auth);

// Загрузка аватара
document.getElementById('uploadAvatar').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fileRef = ref(storage, `avatars/${auth.currentUser.uid}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  await updateProfile(auth.currentUser, { photoURL: url });
  location.reload();
};

// --- 2. ЛЕНТА ПОСТОВ (ЛАЙКИ, ДИЗЛАЙКИ, УДАЛЕНИЕ, РЕДАКТИРОВАНИЕ) ---
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(postsQuery, (snapshot) => {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  
  snapshot.forEach((docSnap) => {
    const post = docSnap.data();
    const id = docSnap.id;
    const isOwner = auth.currentUser && auth.currentUser.email === post.authorEmail;

    const postEl = document.createElement('div');
    postEl.className = 'card';
    postEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${post.authorPhoto || ''}" class="avatar">
        <strong>${post.authorName || post.authorEmail}</strong>
      </div>
      <p id="text-${id}">${post.text}</p>
      ${post.mediaUrl ? (post.mediaType === 'video' ? `<video src="${post.mediaUrl}" controls class="post-media"></video>` : `<img src="${post.mediaUrl}" class="post-media">`) : ''}
      
      <div style="margin-top:10px;">
        <button class="btn btn-action" onclick="window.react('${id}', 'likes')">❤️ ${post.likes || 0}</button>
        <button class="btn btn-action" onclick="window.react('${id}', 'dislikes')">👎 ${post.dislikes || 0}</button>
        ${isOwner ? `
          <button class="btn btn-action" onclick="window.editPost('${id}')">✏️</button>
          <button class="btn btn-danger" onclick="window.deletePost('${id}')">🗑</button>
        ` : ''}
      </div>

      <div class="comment-section">
        <div id="comments-${id}">
          ${(post.comments || []).map(c => `
            <div class="comment">
              <b>${c.user}:</b> ${c.text} 
              <button style="border:none; background:none; color:blue; cursor:pointer;" onclick="window.reply('${id}', '${c.user}')">ответить</button>
            </div>
          `).join('')}
        </div>
        <input type="text" id="input-${id}" placeholder="Написать комментарий..." style="width:70%; margin-top:5px;">
        <button class="btn btn-primary" onclick="window.addComment('${id}')">></button>
      </div>
    `;
    feed.appendChild(postEl);
  });
});

// Функции действий
window.react = async (id, type) => {
  const ref = doc(db, "posts", id);
  onSnapshot(ref, async (d) => {
    const val = (d.data()[type] || 0) + 1;
    await updateDoc(ref, { [type]: val });
  }, {onlyOnce: true});
};

window.deletePost = async (id) => { if(confirm("Удалить?")) await deleteDoc(doc(db, "posts", id)); };

window.editPost = async (id) => {
  const newText = prompt("Введите новый текст:", document.getElementById(`text-${id}`).innerText);
  if (newText) await updateDoc(doc(db, "posts", id), { text: newText });
};

window.addComment = async (id) => {
  const input = document.getElementById(`input-${id}`);
  if (!input.value || !auth.currentUser) return;
  await updateDoc(doc(db, "posts", id), {
    comments: arrayUnion({
      user: auth.currentUser.displayName || auth.currentUser.email,
      text: input.value,
      at: new Date().toISOString()
    })
  });
  input.value = '';
};

window.reply = (id, userName) => {
  document.getElementById(`input-${id}`).value = `${userName}, `;
  document.getElementById(`input-${id}`).focus();
};

// --- 3. СОЗДАНИЕ ПОСТА ---
document.getElementById('submitBtn').onclick = async () => {
  const text = document.getElementById('postText').value;
  const file = document.getElementById('postFile').files[0];
  const user = auth.currentUser;
  if (!user) return alert("Войдите!");

  let mediaUrl = "", mediaType = "";
  if (file) {
    const fRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(fRef, file);
    mediaUrl = await getDownloadURL(fRef);
    mediaType = file.type.startsWith('video') ? 'video' : 'image';
  }

  await addDoc(collection(db, "posts"), {
    text, mediaUrl, mediaType,
    authorEmail: user.email,
    authorName: user.displayName,
    authorPhoto: user.photoURL,
    likes: 0, dislikes: 0,
    comments: [],
    createdAt: serverTimestamp()
  });
  document.getElementById('postText').value = '';
};
