// Подключаем Firebase напрямую из браузера (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Твой конфиг
const firebaseConfig = {
  apiKey: "AIzaSyBjpnPfD8dAs1EOnH8W0IWzqDiNAGS7yIA",
  authDomain: "zv-social.firebaseapp.com",
  projectId: "zv-social",
  storageBucket: "zv-social.firebasestorage.app",
  messagingSenderId: "228630589056",
  appId: "1:228630589056:web:36709b7a51fe906d3d0065",
  measurementId: "G-8C01JFMJ2Q"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Элементы интерфейса
const postForm = document.getElementById('postForm');
const postText = document.getElementById('postText');
const postFile = document.getElementById('postFile');
const submitBtn = document.getElementById('submitBtn');
const feedContainer = document.getElementById('feed');

// 1. ЗАГРУЗКА ПОСТОВ В РЕАЛЬНОМ ВРЕМЕНИ
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(postsQuery, (snapshot) => {
  feedContainer.innerHTML = ''; // Очищаем ленту перед обновлением
  
  snapshot.forEach((docSnap) => {
    const post = docSnap.data();
    const postId = docSnap.id;
    
    // Создаем карточку поста
    const postElement = document.createElement('div');
    postElement.className = 'post';
    
    let mediaHtml = '';
    if (post.mediaUrl) {
      if (post.mediaType === 'video') {
        mediaHtml = `<video src="${post.mediaUrl}" controls></video>`;
      } else {
        mediaHtml = `<img src="${post.mediaUrl}" alt="Фото">`;
      }
    }

    postElement.innerHTML = `
      <strong>${post.author || 'Пользователь ZV'}</strong>
      <p>${post.text}</p>
      ${mediaHtml}
      <div class="post-actions">
        <button onclick="window.likePost('${postId}', ${post.likes})">👍 ${post.likes || 0}</button>
        <button onclick="window.deletePost('${postId}')" style="background: #dc3545; margin-left: 10px;">🗑 Удалить</button>
      </div>
    `;
    
    feedContainer.appendChild(postElement);
  });
});

// 2. СОЗДАНИЕ ПОСТА (Текст + Фото/Видео)
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = postText.value.trim();
  const file = postFile.files[0];
  
  if (!text && !file) return; // Не публикуем пустоту
  
  submitBtn.disabled = true;
  submitBtn.innerText = 'Загрузка...';

  let mediaUrl = "";
  let mediaType = "";

  try {
    // Если есть файл, грузим его в Storage
    if (file) {
      const fileRef = ref(storage, `posts/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      mediaUrl = await getDownloadURL(fileRef);
      mediaType = file.type.startsWith('video') ? 'video' : 'image';
    }

    // Сохраняем данные поста в Firestore
    await addDoc(collection(db, "posts"), {
      text: text,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      author: 'Аноним', // Пока нет регистрации
      likes: 0,
      createdAt: new Date()
    });

    // Очищаем форму
    postText.value = '';
    postFile.value = '';
  } catch (error) {
    console.error("Ошибка при публикации:", error);
    alert("Произошла ошибка. Проверьте правила Storage в Firebase.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Опубликовать';
  }
});

// 3. ЛАЙКИ И УДАЛЕНИЕ (Делаем функции глобальными, чтобы их видел HTML)
window.likePost = async (postId, currentLikes) => {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    likes: (currentLikes || 0) + 1
  });
};

window.deletePost = async (postId) => {
  if(confirm("Точно удалить пост?")) {
    await deleteDoc(doc(db, "posts", postId));
  }
};
