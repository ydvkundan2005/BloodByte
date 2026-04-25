import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase, ref, push, onValue, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB0d0vC7VutjxrvVNk0Zu39vtSj5_TSDYk",
    authDomain: "bloodbyte-3011.firebaseapp.com",
    databaseURL: "https://bloodbyte-3011-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bloodbyte-3011",
    storageBucket: "bloodbyte-3011.firebaseapp.com",
    messagingSenderId: "369161777896",
    appId: "1:369161777896:web:1858c97aa47e1a28a68f5d",
    measurementId: "G-B8DHFG6XB4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// GLOBALS
let user = null;
let loc = null;
let curReq = null;
let chatID = null;
let isBusy = false; 
let allRequests = [];
let watchId = null; 

// UI HELPERS
window.nav = (h, s) => { 
    document.getElementById(h).style.display='none'; 
    document.getElementById(s).style.display='flex';
};

// --- PANEL LOGIC (HISTORY API) ---
window.openPanel = (id) => {
    document.getElementById(id).classList.add('open');
    if(id === 'panel-notif') document.getElementById('dot-notif').style.display='none';
    if(id === 'panel-chats') document.getElementById('dot-chat').style.display='none';
    
    // Add to history
    history.pushState({panelId: id}, null, "");
};

// Listen for Back Button / Swipe
window.onpopstate = (event) => {
    // If popstate fires, close panels
    document.querySelectorAll('.panel.open').forEach(p => p.classList.remove('open'));
};

window.closePanel = (id) => {
    document.getElementById(id).classList.remove('open');
};

const load = (s, txt="Loading...") => {
    const l = document.getElementById('loader');
    l.style.display = s ? 'flex' : 'none';
    document.getElementById('loader-text').innerText = txt;
};

// CUSTOM MESSAGE FUNCTION
window.showMsg = (txt, isError=true) => {
    const m = document.getElementById('msg-modal');
    const c = document.getElementById('msg-card-inner');
    const i = document.getElementById('msg-icon');
    c.className = isError ? "msg-card msg-error" : "msg-card msg-success";
    i.className = isError ? "fa-solid fa-circle-exclamation msg-icon" : "fa-solid fa-circle-check msg-icon";
    document.getElementById('msg-title').innerText = isError ? "Error" : "Success";
    document.getElementById('msg-txt').innerText = txt;
    m.style.display = 'flex';
    load(false); 
}

// --- ENTER KEY FOR CHAT ---
document.getElementById('msg-in').addEventListener('keydown', (e) => {
    if(e.key === 'Enter') sendMsg();
});

window.enableNotif = () => {
    Notification.requestPermission().then(perm => {
        if(perm === 'granted') {
            document.getElementById('notif-modal').style.display='none';
            showMsg("Notifications Active!", false);
        }
    });
};
function notify(msg) {
    if(Notification.permission === 'granted') new Notification("BloodByte", { body: msg });
}

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, async (u) => {
    if(isBusy) return; 

    if(u) {
        if(document.getElementById('dashboard-view').style.display === 'none') {
            await loadDashboard(u);
        }
    } else {
        if(document.getElementById('dashboard-view').style.display === 'block') {
            window.location.reload(); 
        }
    }
});

async function loadDashboard(u) {
    load(true, "Syncing Profile...");
    user = u;
    try {
        let d = null;
        for(let i=0; i<3; i++) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if(snap.exists()) { d = snap.data(); break; }
            await new Promise(r => setTimeout(r, 800));
        }

        if(d) {
            document.getElementById('dash-name').innerText = d.name;
            document.getElementById('dash-info').innerText = `${d.bloodGroup} | ${d.dob}`;
            
            startListeners();
            
            document.querySelectorAll('.view').forEach(v => v.style.display='none');
            document.getElementById('dashboard-view').style.display='block';
            document.getElementById('main-dock').style.display='flex';

            if(Notification.permission === 'default') {
                document.getElementById('notif-modal').style.display = 'flex';
            }
            
            startAutoLocation();

        } else {
             document.getElementById('dash-name').innerText = "Guest";
        }
    } catch(e) {
        console.error(e);
    } finally {
        load(false);
    }
}

// --- REGISTER ---
window.doRegister = async () => {
    const n = document.getElementById('reg-name').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-pass').value;
    const b = document.getElementById('reg-blood').value;
    const d = document.getElementById('reg-dob').value;
    
    if(!n || !e || !p || !b || !d) return showMsg("Fill all fields");
    if((new Date().getFullYear() - new Date(d).getFullYear()) < 18) return showMsg("Must be 18+");

    isBusy = true; 
    load(true, "Creating ID...");
    
    try {
        const cred = await createUserWithEmailAndPassword(auth, e, p);
        const uid = cred.user.uid;
        await setDoc(doc(db, "users", uid), { name:n, email:e, bloodGroup:b, dob:d, uid:uid });
        set(ref(rtdb, `users/${uid}`), { name:n });
        await loadDashboard(cred.user);
    } catch(err) {
        if(err.code === 'auth/email-already-in-use') showMsg("Email exists. Please Login.");
        else showMsg(err.message);
        load(false);
    } finally {
        isBusy = false;
    }
};

// --- LOGIN ---
window.doLogin = async () => {
    const e = document.getElementById('log-email').value.trim();
    const p = document.getElementById('log-pass').value;
    if(!e || !p) return showMsg("Enter credentials");
    
    isBusy = true; 
    load(true, "Logging In...");
    
    try {
        const cred = await signInWithEmailAndPassword(auth, e, p);
        load(false); 
        
        const loginView = document.getElementById('login-view');
        loginView.classList.add('blasting-out');
        
        setTimeout(async () => {
             await loadDashboard(cred.user);
             loginView.classList.remove('blasting-out');
        }, 600); 

    } catch(err) {
        showMsg("Incorrect Email or Password.");
        load(false);
    } finally {
        isBusy = false;
    }
};

window.doLogout = async () => {
    if(confirm("Logout?")) {
        if(watchId) navigator.geolocation.clearWatch(watchId);
        await signOut(auth);
        window.location.reload();
    }
};

window.resetPass = async () => {
    const e = prompt("Email for reset link:");
    if(e) try { await sendPasswordResetEmail(auth, e); showMsg("Reset link sent!", false); } catch(x){showMsg(x.message);}
};

// --- AUTOMATIC BACKGROUND LOCATION ---
function startAutoLocation() {
    if(!navigator.geolocation) return;
    
    const icon = document.getElementById('loc-indicator');
    icon.classList.add('scanning-active'); 

    watchId = navigator.geolocation.watchPosition(
        async (pos) => {
            loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            icon.classList.remove('scanning-active');
            icon.classList.add('location-active');
            
            if(user) await setDoc(doc(db, "users", user.uid), { location: loc }, { merge: true });
            
            renderFeed();
        }, 
        (err) => {
            console.warn("Auto-location error:", err);
            icon.classList.remove('scanning-active');
            icon.classList.remove('location-active');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
}

window.forceLocationUpdate = () => {
    load(true, "Refreshing Location...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            renderFeed();
            load(false);
            showMsg("Location Refreshed", false);
        },
        () => { load(false); showMsg("Location Check Failed"); }
    );
}


function getDist(l1, ln1, l2, ln2) {
    if(!l1 || !l2) return 999;
    const R = 6371;
    const dLa = (l2-l1) * Math.PI/180;
    const dLo = (ln2-ln1) * Math.PI/180;
    const a = Math.sin(dLa/2)*Math.sin(dLa/2) + Math.cos(l1*Math.PI/180)*Math.cos(l2*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- FEED (REALTIME) ---
function startFirestoreListener() {
    onSnapshot(collection(db, "requests"), (snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => allRequests.push({ id: doc.id, ...doc.data() }));
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" && loc) {
                const d = change.doc.data();
                if (d.reqId !== user.uid) {
                     const dist = getDist(loc.lat, loc.lng, d.location.lat, d.location.lng);
                     if(dist <= 20) notify(`Urgent: ${d.bloodGroup} needed nearby!`);
                }
            }
        });
        renderFeed();
    });
}

function renderFeed() {
    const myList = document.getElementById('my-req-list');
    const feedList = document.getElementById('feed-list');
    const myCont = document.getElementById('my-req-container');
    myList.innerHTML = ""; feedList.innerHTML = "";
    let myCount = 0; let feedCount = 0;

    allRequests.forEach(d => {
        if(d.reqId === user.uid) {
            myCount++;
            const div = document.createElement('div');
            div.className = "glass-card req-card";
            div.innerHTML = `
                <div class="del-btn" onclick="event.stopPropagation(); deleteReq('${d.id}')"><i class="fa-solid fa-trash"></i></div>
                <div class="badge">${d.bloodGroup}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;">${d.patient}</div>
                    <div style="font-size:12px; color:#aaa;">${d.hospital}</div>
                </div>
                <div style="font-size:12px; color:var(--primary);">Active</div>
            `;
            myList.appendChild(div);
        } else {
            let dist = 0;
            if(loc) dist = getDist(loc.lat, loc.lng, d.location.lat, d.location.lng);
            if(loc && dist <= 20) {
                feedCount++;
                const div = document.createElement('div');
                div.className = "glass-card req-card";
                div.innerHTML = `
                    <div class="badge">${d.bloodGroup}</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;">${d.patient}</div>
                        <div style="font-size:12px; color:#aaa;">${d.hospital}</div>
                    </div>
                    <div style="font-size:12px;">${dist.toFixed(1)+' km'}</div>
                `;
                div.onclick = () => showDetail(d, dist);
                feedList.appendChild(div);
            }
        }
    });

    myCont.style.display = myCount > 0 ? 'block' : 'none';
    if(!loc) {
         feedList.innerHTML = "<p style='text-align:center; color:#555; margin-top:20px;'><i class='fa-solid fa-circle-notch fa-spin'></i> Auto-scanning area...</p>";
    } else if(feedCount === 0) {
         feedList.innerHTML = "<p style='text-align:center; color:#555; margin-top:20px;'>No requests within 20km.</p>";
    }
}

// --- REQUESTS ---
let rLoc = null;
window.getReqLoc = () => {
    const btn = document.getElementById('btn-req-loc');
    btn.classList.add('loading');
    btn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(pos => {
        rLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById('req-coord').value = "Location Set ✔";
        btn.classList.remove('loading');
        btn.disabled = false;
    }, (err) => {
        btn.classList.remove('loading');
        btn.disabled = false;
        showMsg("Could not get location.");
    });
};

window.submitReq = async () => {
    if(!rLoc) return showMsg("Location Required");
    const d = {
        reqId: user.uid,
        reqName: document.getElementById('dash-name').innerText,
        patient: document.getElementById('req-pat').value,
        bloodGroup: document.getElementById('req-bg').value,
        hospital: document.getElementById('req-hosp').value,
        contact: document.getElementById('req-phone').value,
        benefits: document.getElementById('req-ben').value,
        location: rLoc,
        time: Date.now()
    };
    load(true, "Posting...");
    await addDoc(collection(db, "requests"), d);
    load(false);
    showMsg("Request Live!", false);
    history.back(); 
};

window.deleteReq = async (id) => {
    if(confirm("Delete request?")) {
        load(true);
        await deleteDoc(doc(db, "requests", id));
        load(false);
    }
};

// --- DETAILS ---
window.showDetail = (d, dist) => {
    curReq = d;
    document.getElementById('det-bg').innerText = d.bloodGroup;
    document.getElementById('det-pat').innerText = d.patient;
    document.getElementById('det-hosp').innerText = d.hospital;
    document.getElementById('det-con').innerText = d.contact;
    document.getElementById('det-ben').innerText = d.benefits || "None";
    document.getElementById('det-dist').innerText = dist ? dist.toFixed(1) + " km" : "--";
    
    const btn = document.getElementById('btn-acc');
    btn.disabled = false; btn.innerText = "I Accept";
    window.openPanel('panel-detail');
};

window.doAccept = () => {
    const btn = document.getElementById('btn-acc');
    btn.disabled = true; btn.innerText = "Accepted!";
    push(ref(rtdb, `notif/${curReq.reqId}`), {
        from: document.getElementById('dash-name').innerText,
        msg: "Accepted your request!",
        time: Date.now()
    });
    showMsg("Accepted!", false);
};

// --- CHAT ---
window.openChat = () => {
    startChat(curReq.reqId, curReq.reqName);
};

window.startChat = (uid, name) => {
    const my = user.uid;
    chatID = my < uid ? `${my}_${uid}` : `${uid}_${my}`;
    document.getElementById('chat-name').innerText = name;
    window.openPanel('panel-room');
    
    const box = document.getElementById('msgs-box');
    onValue(ref(rtdb, `chats/${chatID}`), snap => {
        box.innerHTML = "";
        const data = snap.val();
        if(data) Object.values(data).forEach(m => {
            const b = document.createElement('div');
            b.className = `bubble ${m.sid === my ? 'mine' : 'theirs'}`;
            b.innerText = m.txt;
            box.appendChild(b);
        });
        box.scrollTop = box.scrollHeight;
    });

    set(ref(rtdb, `userChats/${my}/${uid}`), { name: name });
    set(ref(rtdb, `userChats/${uid}/${my}`), { name: document.getElementById('dash-name').innerText });
};

window.sendMsg = () => {
    const t = document.getElementById('msg-in').value;
    if(!t) return;
    push(ref(rtdb, `chats/${chatID}`), { sid: user.uid, txt: t });
    document.getElementById('msg-in').value = "";
    document.getElementById('msg-in').focus(); 
};

// --- LISTENERS ---
function startListeners() {
    startFirestoreListener();

    let initNotif = true;
    onValue(ref(rtdb, `notif/${user.uid}`), snap => {
        const l = document.getElementById('notif-list');
        l.innerHTML = "";
        const d = snap.val();
        if(d) {
            document.getElementById('dot-notif').style.display = 'block';
            Object.values(d).reverse().forEach(n => {
                const div = document.createElement('div');
                div.className = "glass-card"; div.style.marginBottom="10px";
                div.innerHTML = `<b>${n.from}</b><br>${n.msg}<div style="font-size:10px; color:#aaa;">${new Date(n.time).toLocaleTimeString()}</div>`;
                l.appendChild(div);
            });
            if(!initNotif) notify("New Notification!");
        }
        initNotif = false;
    });

    onValue(ref(rtdb, `userChats/${user.uid}`), snap => {
        const l = document.getElementById('chat-list');
        l.innerHTML = "";
        const d = snap.val();
        if(d) {
            Object.keys(d).forEach(uid => {
                const div = document.createElement('div');
                div.className = "glass-card"; div.style.marginBottom="10px"; div.style.cursor="pointer";
                div.innerHTML = `<b>${d[uid].name}</b>`;
                div.onclick = () => window.startChat(uid, d[uid].name);
                l.appendChild(div);
            });
            document.getElementById('dot-chat').style.display = 'block';
        }
    });
}

window.showInfo = (t) => {
    document.getElementById('info-ti').innerText = t;
    const u = document.getElementById('info-co');
    u.innerHTML = (t==='Safety' ? 
        ['Drink Water','Sterile Needles','Rest 15m'] : 
        ['Save 3 Lives','Heart Health','Free Checkup']).map(i=>`<li>${i}</li>`).join('');
    window.openPanel('panel-info');
};

const q = ["Heroes come in all sizes.", "Tears can't save life, Blood can.", "Be a savior today."];
setInterval(() => document.getElementById('quote').innerText = q[Math.floor(Math.random()*q.length)], 60000);


