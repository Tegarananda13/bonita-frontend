import axios from 'axios';

const BASE_URL = 'http://localhost:8080/chatbot';

async function testApiFlow() {
  console.log('=== TEST 1: API INTEGRATION TESTS ===\n');

  // Fetch available active package
  const paketRes = await axios.get('http://localhost:8080/paket');
  const availablePaket = paketRes.data.paket.find(p => p.sisa_kuota > 0);
  if (!availablePaket) throw new Error('No active package with available quota found');
  console.log(`Using available package: "${availablePaket.nama_paket}" (ID: ${availablePaket.id}, Sisa Kuota: ${availablePaket.sisa_kuota})`);

  const chatSessionId = 'test-chat-session-' + Date.now();
  let regSessionId = '';
  let regData = null;
  let flow = '';
  let step = '';

  const send = async (pertanyaan) => {
    const payload = {
      pertanyaan,
      chat_session_id: chatSessionId,
      reg_session_id: regSessionId,
      flow,
      step,
      reg_data: regData,
    };
    const res = await axios.post(BASE_URL, payload);
    const data = res.data.data;
    flow = data.flow || '';
    step = data.step || '';
    regSessionId = data.reg_session_id || '';
    regData = data.reg_data || null;
    return data;
  };

  // 1. Customer memulai pendaftaran pertama
  console.log('\n[Scenario 1] Customer memulai pendaftaran pertama...');
  let res = await send('Saya ingin daftar umroh');
  console.log('  -> Response step:', res.step, '| reg_session_id:', res.reg_session_id);
  if (res.step !== 'pilih_paket' || !res.reg_session_id) throw new Error('Failed starting registration 1');

  // Pilih paket
  res = await send(availablePaket.nama_paket);
  console.log('  -> Response step:', res.step);
  if (res.step !== 'ask_nik') throw new Error('Failed choosing package: ' + res.jawaban);

  // Masukkan data jamaah 1
  const nik1 = '320101' + Math.floor(1000000000 + Math.random() * 9000000000);
  res = await send(nik1); // ask_nik
  res = await send('Ahmad Fauzi'); // ask_nama
  res = await send('Jakarta'); // ask_tempat_lahir
  res = await send('1990-05-15'); // ask_tanggal_lahir
  res = await send('Laki-laki'); // ask_jenis_kelamin
  res = await send('081234567891'); // ask_no_hp
  res = await send('ahmad.fauzi@example.com'); // ask_email
  res = await send('Jl. Melati No. 10'); // ask_alamat
  res = await send('DKI Jakarta'); // ask_provinsi
  res = await send('Jakarta Selatan'); // ask_kabupaten
  res = await send('Cilandak'); // ask_kecamatan
  res = await send('Gandaria Selatan'); // ask_kelurahan
  res = await send('12420'); // ask_kode_pos
  console.log('  -> Ringkasan step:', res.step);
  if (res.step !== 'konfirmasi') throw new Error('Failed reaching confirmation: ' + res.jawaban);

  // Konfirmasi Ya
  res = await send('Ya');
  console.log('  -> Konfirmasi sukses! Step:', res.step, '| Flow:', res.flow);
  console.log('  -> UMR 1:', res.nomor_pendaftaran);
  console.log('  -> Jawaban preview:\n', res.jawaban);
  const umr1 = res.nomor_pendaftaran;
  if (!umr1 || res.step !== 'selesai' || res.flow !== '') {
    throw new Error('Registration 1 did not complete cleanly');
  }

  // 2. Customer meminta pendaftaran kedua dalam percakapan yang sama
  console.log('\n[Scenario 2 & 3] Customer meminta pendaftaran kedua dalam percakapan yang sama...');
  res = await send('Saya mau daftar lagi untuk keluarga');
  console.log('  -> Response step:', res.step, '| Flow:', res.flow, '| new reg_session_id:', res.reg_session_id);
  if (res.step !== 'pilih_paket' || res.flow !== 'registrasi' || !res.reg_session_id) {
    throw new Error('Registration 2 did not start cleanly! Returned: ' + res.jawaban);
  }

  // Pilih paket untuk jamaah 2
  res = await send(availablePaket.nama_paket);
  console.log('  -> Response step:', res.step);

  // Masukkan data jamaah 2
  const nik2 = '320102' + Math.floor(1000000000 + Math.random() * 9000000000);
  res = await send(nik2); // ask_nik
  res = await send('Siti Aminah'); // ask_nama
  res = await send('Bandung'); // ask_tempat_lahir
  res = await send('1993-08-20'); // ask_tanggal_lahir
  res = await send('Perempuan'); // ask_jenis_kelamin
  res = await send('081298765432'); // ask_no_hp
  res = await send('siti.aminah@example.com'); // ask_email
  res = await send('Jl. Anggrek No. 5'); // ask_alamat
  res = await send('Jawa Barat'); // ask_provinsi
  res = await send('Kota Bandung'); // ask_kabupaten
  res = await send('Coblong'); // ask_kecamatan
  res = await send('Dago'); // ask_kelurahan
  res = await send('40135'); // ask_kode_pos
  // Konfirmasi Ya
  res = await send('Ya');
  console.log('  -> Konfirmasi sukses UMR 2! Step:', res.step, '| Flow:', res.flow);
  console.log('  -> UMR 2:', res.nomor_pendaftaran);
  const umr2 = res.nomor_pendaftaran;
  if (!umr2 || umr1 === umr2) {
    throw new Error('UMR 2 must be different from UMR 1');
  }

  // 4. Customer memulai pendaftaran ketiga
  console.log('\n[Scenario 4] Customer memulai pendaftaran ketiga...');
  res = await send('Daftar umroh');
  console.log('  -> Response step:', res.step, '| Flow:', res.flow, '| reg_session_id:', res.reg_session_id);
  if (res.step !== 'pilih_paket' || res.flow !== 'registrasi') throw new Error('Registration 3 failed to start');

  // 5. Customer membatalkan proses pendaftaran sebelum selesai, kemudian memulai pendaftaran baru
  console.log('\n[Scenario 5] Customer membatalkan proses pendaftaran...');
  res = await send('Batal');
  console.log('  -> Response step:', res.step, '| Flow:', res.flow, '| Jawaban:', res.jawaban);
  if (res.step !== 'batal' || res.flow !== '') throw new Error('Cancellation failed');

  console.log('  -> Memulai pendaftaran baru setelah batal...');
  res = await send('Daftar umroh');
  console.log('  -> Response step:', res.step, '| Flow:', res.flow);
  if (res.step !== 'pilih_paket') throw new Error('Restarting after cancellation failed');

  // Batalkan lagi
  res = await send('Batal');

  // 6. Customer bertanya tentang hal umum ke Gemini tanpa memulai pendaftaran baru
  console.log('\n[Scenario 6] Customer bertanya hal umum ke Gemini tanpa memulai pendaftaran baru...');
  res = await send('Apa saja tips persiapan sebelum berangkat umroh?');
  console.log('  -> Response flow:', res.flow, '| step:', res.step);
  console.log('  -> Jawaban preview:', res.jawaban.substring(0, 100) + '...');
  if (res.flow !== '' || res.step !== '') throw new Error('Non-registration inquiry should keep flow empty');

  console.log('\n✅ ALL API INTEGRATION SCENARIOS PASSED!');
  return { umr1, umr2 };
}

async function main() {
  try {
    const { umr1, umr2 } = await testApiFlow();
    console.log('\nResult summary:');
    console.log('Pendaftaran 1 UMR:', umr1);
    console.log('Pendaftaran 2 UMR:', umr2);
    console.log('Both registrations created independently in the same chat session with distinct UMR numbers!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

main();
