import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// ВСТАВЬ СВОЙ КОНФИГ НИЖЕ
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

// Навигация
window.showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0,0);
};

const init = () => {
    const loginBtn = document.getElementById('loginBtn');
    const regBtn = document.getElementById('regBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Авторизация
    loginBtn.onclick = () => handleAuth('login');
    regBtn.onclick = () => handleAuth('register');
    logoutBtn.onclick = () => signOut(auth);

    async function handleAuth(type) {
        const e = document.getElementById('email').value;
        const p = document.getElementById('password').value;
        if(!e || !p) return alert("Заполните данные");
        try {
            if (type === 'register') await createUserWithEmailAndPassword(auth, e, p);
            else await signInWithEmailAndPassword(auth, e, p);
        } catch (err) { alert(err.message); }
    }

    onAuthStateChanged(auth, (user) => {
        const isUser = !!user;
        document.getElementById('authBlock').classList.toggle('hidden', isUser);
        document.getElementById('toProfileBtn').classList.toggle('hidden', !isUser);
        document.getElementById('logoutBtn').classList.toggle('hidden', !isUser);
        document.getElementById('createPostBlock').classList.toggle('hidden', !isUser);

        if (user) {
            document.getElementById('myNameDisplay').innerText = user.displayName || "Пользователь";
            document.getElementById('myEmailDisplay').innerText = user.email;
            document.getElementById('myAvatar').src = user.photoURL || "https://via.placeholder.com/100";
            loadFeed("myPosts", user.uid);
            loadFeed("feed", null);
        }
    });

    // Настройки
    document.getElementById('saveNickBtn').onclick = async () => {
        const nick = document.getElementById('newNick').value;
        if (nick) {
            await updateProfile(auth.currentUser, { displayName: nick });
            alert("Ник изменен!");
            location.reload();
        }
    };

    document.getElementById('savePassBtn').onclick = async () => {
        const pass = document.getElementById('newPass').value;
        if (pass.length < 6) return alert("Минимум 6 знаков");
        try {
            await updatePassword(auth.currentUser, pass);
            alert("Пароль обновлен");
        } catch (e) { alert("Ошибка (возможно нужен свежий вход): " + e.message); }
    };

    document.getElementById('uploadAvatar').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fRef = ref(storage, `avatars/${auth.currentUser.uid}`);
        await uploadBytes(fRef, file);
        const url = await getDownloadURL(fRef);
        await updateProfile(auth.currentUser, { photoURL: url });
        location.reload();
    };

    // Посты
    submitBtn.onclick = async () => {
        const text = document.getElementById('postText').value;
        if (!text) return;
        await addDoc(collection(db, "posts"), {
            text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || auth.currentUser.email,
            authorPhoto: auth.currentUser.photoURL || "",
            likedBy: [],
            createdAt: serverTimestamp()
        });
        document.getElementById('postText').value = '';
    };

    function loadFeed(containerId, filterUid) {
        let q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        if (filterUid) q = query(collection(db, "posts"), where("authorId", "==", filterUid), orderBy("createdAt", "desc"));

        onSnapshot(q, (snap) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            snap.forEach(d => {
                const post = d.data();
                const id = d.id;
                const isLiked = post.likedBy?.includes(auth.currentUser?.uid);
                
                const postEl = document.createElement('div');
                postEl.className = 'card';
                postEl.innerHTML = `
                    <div class="post-header">
                        <img src="${post.authorPhoto || 'https://via.placeholder.com/40'}" class="avatar-sm">
                        <b>${post.authorName}</b>
                    </div>
                    <p>${post.text}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <button class="btn like-btn ${isLiked ? 'active' : ''}" id="btn-l-${containerId}-${id}">
                            ${isLiked ? '❤️' : '🤍'} ${post.likedBy?.length || 0}
                        </button>
                        ${post.authorId === auth.currentUser?.uid ? `<button class="btn" style="color:#ff4d4d" id="btn-d-${containerId}-${id}">Удалить</button>` : ''}
                    </div>
                `;
                container.appendChild(postEl);

                document.getElementById(`btn-l-${containerId}-${id}`).onclick = () => toggleLike(id, isLiked);
                const dBtn = document.getElementById(`btn-d-${containerId}-${id}`);
                if(dBtn) dBtn.onclick = () => deletePost(id);
            });
        });
    }

    async function toggleLike(postId, isLiked) {
        if (!auth.currentUser) return;
        const ref = doc(db, "posts", postId);
        await updateDoc(ref, { likedBy: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid) });
    }

    async function deletePost(id) {
        if (confirm("Удалить этот пост?")) await deleteDoc(doc(db, "posts", id));
    }
};

document.addEventListener('DOMContentLoaded', init);
