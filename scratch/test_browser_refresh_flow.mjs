import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function run() {
  console.log('=== TEST: BROWSER SESSION REFRESH & CHATBOT UI ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9224/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:5173...');
    await send('Page.navigate', { url: 'http://localhost:5173' });
    await new Promise(r => setTimeout(r, 2000));

    // 1. Open chatbot
    console.log('Opening chatbot...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.chatbot-fab')?.click();`
    });
    await new Promise(r => setTimeout(r, 600));

    // Check chat session ID
    const initialSession = await send('Runtime.evaluate', {
      expression: `sessionStorage.getItem('bonita_chat_session_id')`,
      returnByValue: true
    });
    console.log('Chat Session ID on first load:', initialSession.result.value);
    const firstChatSessId = initialSession.result.value;

    // Send a message via UI
    console.log('Sending message "Halo Bonita"...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('.chatbot-input-area input');
          const form = document.querySelector('.chatbot-input-area');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, "Halo Bonita");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        })()
      `
    });

    // Wait until response appears and is stored in sessionStorage
    console.log('Waiting for response to complete...');
    let ssStoredCount = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const raw = sessionStorage.getItem('bonita_chat_messages');
            return raw ? JSON.parse(raw).length : 0;
          })()
        `,
        returnByValue: true
      });
      ssStoredCount = res.result.value;
      if (ssStoredCount >= 3) break;
    }
    console.log('Messages stored in sessionStorage before reload:', ssStoredCount);

    const msgCountBefore = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.message-row').length`,
      returnByValue: true
    });
    console.log('DOM Message rows before reload:', msgCountBefore.result.value);

    // 2. Reload page (simulate user refreshing page)
    console.log('\n--- Reloading Page (Scenario 7: Refresh Halaman) ---');
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));

    // Open chatbot again
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.chatbot-fab')?.click();`
    });
    await new Promise(r => setTimeout(r, 600));

    // Verify Chat Session ID is preserved
    const afterReloadSession = await send('Runtime.evaluate', {
      expression: `sessionStorage.getItem('bonita_chat_session_id')`,
      returnByValue: true
    });
    console.log('Chat Session ID after reload:', afterReloadSession.result.value);
    if (afterReloadSession.result.value !== firstChatSessId) {
      throw new Error('Chat session ID changed after reload! Should be persistent.');
    }

    // Verify Messages are preserved
    const msgCountAfter = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.message-row').length`,
      returnByValue: true
    });
    console.log('DOM Message rows after reload:', msgCountAfter.result.value);
    if (msgCountAfter.result.value !== msgCountBefore.result.value) {
      throw new Error(`Messages mismatch after reload! Expected ${msgCountBefore.result.value}, got ${msgCountAfter.result.value}`);
    }

    console.log('\n✅ BROWSER REFRESH TEST PASSED: Chat Session & Conversation History fully preserved on reload!');
    ws.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    chrome.kill();
  }
}

run();
