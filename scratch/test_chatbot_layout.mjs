import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json', (res) => {
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
    await send('Page.navigate', { url: 'http://localhost:5173' });
    await new Promise(r => setTimeout(r, 2000));

    // Open chatbot
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.chatbot-fab')?.click();`
    });
    await new Promise(r => setTimeout(r, 500));

    // Send real user message "Hotel" through UI
    console.log('--- Testing Real Input UI for "Hotel" ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('.chatbot-input-area input');
          const form = document.querySelector('.chatbot-input-area');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, "Hotel");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2500));

    // Send real user message "Pembayaran" through UI
    console.log('--- Testing Real Input UI for "Pembayaran" ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('.chatbot-input-area input');
          const form = document.querySelector('.chatbot-input-area');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, "Pembayaran");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2500));

    // Now inject all other required test cases to thoroughly verify layout
    const testCasesEvaluation = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const container = document.querySelector('.chatbot-messages');
          const testHtml = \`
            <div class="message-row bot test-short-assistant-hotel">
              <div class="bot-avatar-sm">🤖</div>
              <div class="message-body">
                <div class="message-bubble bot">
                  <p><span>Hotel</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row bot test-short-assistant-pembayaran">
              <div class="bot-avatar-sm">🤖</div>
              <div class="message-body">
                <div class="message-bubble bot">
                  <p><span>Pembayaran</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row bot test-long-assistant">
              <div class="bot-avatar-sm">🤖</div>
              <div class="message-body">
                <div class="message-bubble bot">
                  <p><span>Paket Umroh Reguler Bonita Umroh mencakup tiket pesawat PP, akomodasi hotel bintang 4/5 di Makkah dan Madinah, makan 3 kali sehari menu Indonesia, visa umroh resmi, bimbingan manasik, dan perlengkapan ibadah lengkap.</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row user test-short-user">
              <div class="message-body">
                <div class="message-bubble user">
                  <p><span>Hotel</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row user test-long-user">
              <div class="message-body">
                <div class="message-bubble user">
                  <p><span>Apakah ada rekomendasi hotel yang dekat dengan Masjidil Haram untuk lansia yang menggunakan kursi roda?</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row bot test-paragraphs">
              <div class="bot-avatar-sm">🤖</div>
              <div class="message-body">
                <div class="message-bubble bot">
                  <p><span>Berikut adalah rincian tahapan pendaftaran umroh:<br /><br />1. Pemilihan paket dan pengisian formulir.<br />2. Pembayaran DP sebesar Rp 5.000.000.<br />3. Penyerahan dokumen (paspor, buku nikah/KTP).<br /><br />Semua proses dapat dipantau langsung di Portal Jamaah.</span></p>
                  <div class="message-time">10:00</div>
                </div>
              </div>
            </div>
            <div class="message-row bot test-kategori-message">
              <div class="bot-avatar-sm">🤖</div>
              <div class="message-body">
                <div class="message-bubble bot">
                  <p><span>Silakan pilih kategori pengaduan Anda:</span></p>
                  <div class="message-time">10:00</div>
                </div>
                <div class="kategori-grid">
                  <button class="kategori-btn">💳 Pembayaran</button>
                  <button class="kategori-btn">📄 Dokumen</button>
                  <button class="kategori-btn">📅 Jadwal</button>
                  <button class="kategori-btn">🏨 Hotel</button>
                  <button class="kategori-btn">✈️ Transportasi</button>
                  <button class="kategori-btn">💬 Lainnya</button>
                </div>
              </div>
            </div>
          \`;
          container.insertAdjacentHTML('beforeend', testHtml);

          const testClasses = [
            'test-short-assistant-hotel',
            'test-short-assistant-pembayaran',
            'test-long-assistant',
            'test-short-user',
            'test-long-user',
            'test-paragraphs',
            'test-kategori-message'
          ];

          return testClasses.map(cls => {
            const row = document.querySelector('.' + cls);
            const body = row.querySelector('.message-body');
            const bubble = row.querySelector('.message-bubble');
            const p = bubble.querySelector('p');
            const span = p.querySelector('span');

            return {
              name: cls,
              pHeight: p.offsetHeight,
              pWidth: p.offsetWidth,
              bubbleWidth: bubble.offsetWidth,
              bubbleHeight: bubble.offsetHeight,
              bodyWidth: body.offsetWidth,
              rowWidth: row.offsetWidth,
              text: span.innerText.substring(0, 35) + (span.innerText.length > 35 ? '...' : '')
            };
          });
        })()
      `,
      returnByValue: true
    });

    console.log('FLOATING MODE TEST RESULTS:');
    console.log(JSON.stringify(testCasesEvaluation.result.value, null, 2));

    // Test transition to Fullscreen mode
    console.log('--- Testing Fullscreen Transition ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.fullscreen-btn')?.click();`
    });
    await new Promise(r => setTimeout(r, 600));

    const fullscreenEvaluation = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const testClasses = [
            'test-short-assistant-hotel',
            'test-short-assistant-pembayaran',
            'test-long-assistant',
            'test-short-user',
            'test-long-user',
            'test-paragraphs',
            'test-kategori-message'
          ];

          const isFullscreenActive = document.querySelector('.chatbot-window')?.classList.contains('fullscreen');

          const items = testClasses.map(cls => {
            const row = document.querySelector('.' + cls);
            const body = row.querySelector('.message-body');
            const bubble = row.querySelector('.message-bubble');
            const p = bubble.querySelector('p');
            return {
              name: cls,
              pHeight: p.offsetHeight,
              pWidth: p.offsetWidth,
              bubbleWidth: bubble.offsetWidth,
              bubbleHeight: bubble.offsetHeight,
              bodyWidth: body.offsetWidth,
              rowWidth: row.offsetWidth,
            };
          });

          return { isFullscreenActive, items };
        })()
      `,
      returnByValue: true
    });

    console.log('FULLSCREEN MODE RESULTS:');
    console.log(JSON.stringify(fullscreenEvaluation.result.value, null, 2));

    // Test transition back to Floating mode
    console.log('--- Testing Return to Floating Mode ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.fullscreen-btn')?.click();`
    });
    await new Promise(r => setTimeout(r, 600));

    const backToFloatingEvaluation = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const testClasses = [
            'test-short-assistant-hotel',
            'test-short-assistant-pembayaran'
          ];

          const isFloatingActive = !document.querySelector('.chatbot-window')?.classList.contains('fullscreen');

          const items = testClasses.map(cls => {
            const row = document.querySelector('.' + cls);
            const bubble = row.querySelector('.message-bubble');
            const p = bubble.querySelector('p');
            return {
              name: cls,
              pHeight: p.offsetHeight,
              pWidth: p.offsetWidth,
              bubbleWidth: bubble.offsetWidth,
              bubbleHeight: bubble.offsetHeight,
            };
          });

          return { isFloatingActive, items };
        })()
      `,
      returnByValue: true
    });

    console.log('BACK TO FLOATING RESULTS:');
    console.log(JSON.stringify(backToFloatingEvaluation.result.value, null, 2));

    // Also inspect real messages from React in the DOM
    const realReactMessages = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.message-row:not([class*="test-"])'));
          return rows.map((r, i) => {
            const bubble = r.querySelector('.message-bubble');
            const p = bubble?.querySelector('p');
            return {
              idx: i,
              class: r.className,
              text: p ? p.innerText.trim() : (bubble ? bubble.className : ''),
              pHeight: p ? p.offsetHeight : 0,
              pWidth: p ? p.offsetWidth : 0,
              bubbleWidth: bubble ? bubble.offsetWidth : 0,
              bubbleHeight: bubble ? bubble.offsetHeight : 0,
            };
          });
        })()
      `,
      returnByValue: true
    });

    console.log('REAL REACT MESSAGES RESULT:');
    console.log(JSON.stringify(realReactMessages.result.value, null, 2));

    ws.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chrome.kill();
  }
}

run();
