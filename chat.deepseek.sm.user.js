/*
 * Get all session IDs
 * @returns {Array} All session IDs
 */
function get_all_alive_sessions() {
  const aliveSessions = document.querySelectorAll("._546d736");
  return Array.from(aliveSessions).map((s) => s.getAttribute("href").split("/").pop());
}

/**
 * Open IndexedDB database
 * @param {string} dbName Database name
 * @param {number} version Database version (needs to be incremented during upgrade)
 * @returns {Promise<IDBDatabase>} Database instance
 */
function openDB(dbName, version) {
  return new Promise((resolve, reject) => {
    // Open the database, and create it if it doesn't exist

    const request = indexedDB.open(dbName, version);

    // Triggered when the database version is updated (initial creation/version upgrade)

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.length) reject(new Error("对象仓库为空"));
    };

    // Opened successfully

    request.onsuccess = (event) => {
      const db = event.target.result;
      // console.log(db.objectStoreNames);

      resolve(db);
    };

    // Failed to open

    request.onerror = (event) => {
      const db = event.target.result;
      db.close();
      reject(new Error(`打开数据库失败：${event.target.error.message}`));
    };
  });
}

/**
 * Traverse object repository data using a cursor
 * @param {IDBDatabase} db Database instance
 * @param {string} storeName Object repository name
 * @returns {Promise<Array>} Traversal results
 */
function getDatasByCursor(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.openCursor(); // Open cursor

    const result = [];

    const alive_sessions_id = get_all_alive_sessions();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        // The cursor points to the current data, which can be accessed through cursor.value.

        let data = cursor.value;
        let id = data.data.chat_session.id;
        if (id in alive_sessions_id) {
          result.push(data);
          cursor.continue(); // Continue to the next data
        } else {
          console.log(`会话[${data.data.chat_session.id}]已过期/删除`);
          // Delete expired sessions

          store.delete(id);
        }
      } else {
        // Cursor traversal ended

        resolve(result);
      }
    };

    request.onerror = (event) => {
      const cursor = event.target.result;
      cursor.close();
      reject(new Error(`游标遍历失败：${event.target.error.message}`));
    };
  });
}

function getAllMessages(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.getAll(); // Get all data

    const alive_sessions_id = get_all_alive_sessions();
    var result = [];

    request.onsuccess = (event) => {
      const data = event.target.result;
      for (s of data) {
        let id = s.data.chat_session.id;
        if (id in alive_sessions_id) {
          result.push(s);
          cursor.continue(); // Continue to the next data
        } else {
          console.log(`会话[${id}]已过期, 正在删除...`);
          // Delete expired sessions

          store.delete(id);
        }
      }
      resolve(data);
    };

    request.onerror = (event) => {
      reject(new Error(`获取全部数据失败：${event.target.error.message}`));
    };
  });
}

async function main() {
  const db = await openDB("deepseek-chat", 1);
  console.log("数据库打开成功");
  return await getAllMessages(db, "history-message");
}

main().then(console.log).catch(console.error);
