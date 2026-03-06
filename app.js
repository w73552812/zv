import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

const init = () => {
    // Элементы
    const loginBtn = document.getElementById('loginBtn');
    const regBtn = document.getElementById('regBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const submitBtn = document.getElementById('submitBtn');
    const uploadAvatar = document.getElementById('uploadAvatar');

    // Авторизация
    loginBtn.onclick = () => handleAuth('login');
    regBtn.onclick = () => handleAuth('register');
    logoutBtn.onclick = () => signOut(auth);

    async function handleAuth(type) {
        const e = document.getElementById('email').value;
        const p = document.getElementById('password').value;
        try {
            if (type === 'register') await createUserWithEmailAndPassword(auth, e, p);
            else await signInWithEmailAndPassword(auth, e, p);
        } catch (err) { alert(err.message); }
    }

    onAuthStateChanged(auth, (user) => {
        document.getElementById('authBlock').classList.toggle('hidden', !!user);
        document.getElementById('profileBlock').classList.toggle('hidden', !user);
        document.getElementById('createPostBlock').classList.toggle('hidden', !user);
        logoutBtn.classList.toggle('hidden', !user);

        if (user) {
            document.getElementById('myName').innerText = user.displayName || user.email;
            document.getElementById('myAvatar').src = user.photoURL || "https://via.placeholder.com/100";
        }
    });

    // Загрузка аватара
    uploadAvatar.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !auth.currentUser) return;
        const fRef = ref(storage, `avatars/${auth.currentUser.uid}`);
        await uploadBytes(fRef, file);
        const url = await getDownloadURL(fRef);
        await updateProfile(auth.currentUser, { photoURL: url });
        location.reload();
    };

    // Создание поста
    submitBtn.onclick = async () => {
        const text = document.getElementById('postText').value;
        if (!text || !auth.currentUser) return;
        await addDoc(collection(db, "posts"), {
            text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || auth.currentUser.email,
            authorPhoto: auth.currentUser.photoURL || "",
            likedBy: [], // Массив ID людей, кто лайкнул
            createdAt: serverTimestamp()
        });
        document.getElementById('postText').value = '';
    };

    // Лента
    onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = '';
        snap.forEach(d => {
            const post = d.data();
            const id = d.id;
            const uid = auth.currentUser?.uid;
            const isLiked = post.likedBy?.includes(uid);

            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `
                <div class="post-header">
                    <img src="${post.authorPhoto || 'https://via.placeholder.com/40'}" class="avatar-sm">
                    <b>${post.authorName}</b>
                </div>
                <p>${post.text}</p>
                <button class="btn like-btn ${isLiked ? 'active' : ''}" id="l-${id}">
                    ${isLiked ? '❤️' : '🤍'} ${post.likedBy?.length || 0}
                </button>
            `;
            feed.appendChild(el);

            document.getElementById(`l-${id}`).onclick = () => toggleLike(id, isLiked);
        });
    });

    // ЧЕСТНЫЕ ЛАЙКИ (без накрутки)
    async function toggleLike(postId, isLiked) {
        if (!auth.currentUser) return alert("Войдите!");
        const postRef = doc(db, "posts", postId);
        const uid = auth.currentUser.uid;

        await updateDoc(postRef, {
            likedBy: isLiked ? arrayRemove(uid) : arrayUnion(uid)
        });
    }
};

document.addEventListener('DOMContentLoaded', init);
