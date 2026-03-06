import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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

// Ждем полную загрузку HTML
document.addEventListener('DOMContentLoaded', () => {

    // --- АВТОРИЗАЦИЯ ---
    window.authAction = async (type) => {
        const email = document.getElementById('email')?.value;
        const pass = document.getElementById('password')?.value;
        if (!email || !pass) return alert("Заполните поля!");

        try {
            if (type === 'register') await createUserWithEmailAndPassword(auth, email, pass);
            else await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Ошибка: " + e.message); }
    };

    window.logout = () => signOut(auth);

    onAuthStateChanged(auth, (user) => {
        const ids = ['authBlock', 'createPostBlock', 'profileBlock', 'logoutBtn'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'authBlock') user ? el.classList.add('hidden') : el.classList.remove('hidden');
                else user ? el.classList.remove('hidden') : el.classList.add('hidden');
            }
        });

        if (user) {
            document.getElementById('userHeader').innerText = `ZV: ${user.displayName || user.email}`;
            document.getElementById('myName').innerText = user.displayName || user.email;
            document.getElementById('myAvatar').src = user.photoURL || "https://via.placeholder.com/50";
        }
    });

    // --- СОЗДАНИЕ ПОСТА ---
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const text = document.getElementById('postText').value;
            const file = document.getElementById('postFile').files[0];
            if (!auth.currentUser) return alert("Войдите!");

            submitBtn.disabled = true;
            submitBtn.innerText = "Загрузка...";

            try {
                let mediaUrl = "", mediaType = "";
                if (file) {
                    const fRef = ref(storage, `posts/${Date.now()}_${file.name}`);
                    await uploadBytes(fRef, file);
                    mediaUrl = await getDownloadURL(fRef);
                    mediaType = file.type.startsWith('video') ? 'video' : 'image';
                }

                await addDoc(collection(db, "posts"), {
                    text, mediaUrl, mediaType,
                    authorEmail: auth.currentUser.email,
                    authorName: auth.currentUser.displayName || auth.currentUser.email,
                    authorPhoto: auth.currentUser.photoURL || "",
                    likes: 0, dislikes: 0,
                    comments: [],
                    createdAt: serverTimestamp()
                });
                document.getElementById('postText').value = '';
                document.getElementById('postFile').value = '';
            } catch (e) { console.error(e); }
            finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Опубликовать";
            }
        };
    }

    // --- ЛЕНТА ---
    const feed = document.getElementById('feed');
    if (feed) {
        onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snapshot) => {
            feed.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const post = docSnap.data();
                const id = docSnap.id;
                const isOwner = auth.currentUser && auth.currentUser.email === post.authorEmail;

                const postEl = document.createElement('div');
                postEl.className = 'card';
                postEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${post.authorPhoto || 'https://via.placeholder.com/50'}" class="avatar">
                    <strong>${post.authorName}</strong>
                </div>
                <p id="text-${id}">${post.text}</p>
                ${post.mediaUrl ? (post.mediaType === 'video' ? `<video src="${post.mediaUrl}" controls class="post-media"></video>` : `<img src="${post.mediaUrl}" class="post-media">`) : ''}
                <div style="margin-top:10px;">
                    <button class="btn btn-action" onclick="window.react('${id}', 'likes')">❤️ ${post.likes || 0}</button>
                    <button class="btn btn-action" onclick="window.react('${id}', 'dislikes')">👎 ${post.dislikes || 0}</button>
                    ${isOwner ? `<button class="btn btn-action" onclick="window.editPost('${id}')">✏️</button><button class="btn btn-danger" onclick="window.deletePost('${id}')">🗑</button>` : ''}
                </div>
                <div class="comment-section">
                    <div id="comments-${id}">${(post.comments || []).map(c => `<div class="comment"><b>${c.user}:</b> ${c.text} <button style="border:none; color:blue; cursor:pointer;" onclick="window.reply('${id}', '${c.user}')">ответить</button></div>`).join('')}</div>
                    <input type="text" id="input-${id}" placeholder="Коммент..." style="width:70%;">
                    <button class="btn btn-primary" onclick="window.addComment('${id}')">></button>
                </div>`;
                feed.appendChild(postEl);
            });
        });
    }
});

// Глобальные функции выносим за пределы DOMContentLoaded, но привязываем к window
window.react = async (id, type) => {
    const postRef = doc(db, "posts", id);
    const snap = await getDoc(postRef);
    await updateDoc(postRef, { [type]: (snap.data()[type] || 0) + 1 });
};

window.deletePost = async (id) => { if (confirm("Удалить?")) await deleteDoc(doc(db, "posts", id)); };

window.editPost = async (id) => {
    const newText = prompt("Редактировать:", document.getElementById(`text-${id}`).innerText);
    if (newText) await updateDoc(doc(db, "posts", id), { text: newText });
};

window.addComment = async (id) => {
    const input = document.getElementById(`input-${id}`);
    if (!input.value || !auth.currentUser) return;
    await updateDoc(doc(db, "posts", id), {
        comments: arrayUnion({ user: auth.currentUser.displayName || auth.currentUser.email, text: input.value, at: new Date().toISOString() })
    });
    input.value = '';
};

window.reply = (id, userName) => {
    const input = document.getElementById(`input-${id}`);
    input.value = `${userName}, `;
    input.focus();
};
