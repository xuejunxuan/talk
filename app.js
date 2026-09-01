// Pixtale 静态克隆 - 瀑布流 + 全屏查看 + 下载 + 返回
// 逻辑完全抄袭 pixtale 的 photo-masonry + photo-card + photo-viewer
(() => {
  const masonry = document.getElementById('masonry');
  const empty = document.getElementById('empty');
  const loader = document.getElementById('loader');
  const photoCount = document.getElementById('photoCount');
  const photoSize = document.getElementById('photoSize');
  const regenBtn = document.getElementById('regenBtn');

  // viewer
  const viewer = document.getElementById('viewer');
  const viewerBg = document.getElementById('viewerBg');
  const viewerImg = document.getElementById('viewerImg');
  const viewerName = document.getElementById('viewerName');
  const viewerMeta = document.getElementById('viewerMeta');
  const viewerIndex = document.getElementById('viewerIndex');
  const viewerThumbs = document.getElementById('viewerThumbs');
  const viewerClose = document.getElementById('viewerClose');
  const viewerPrev = document.getElementById('viewerPrev');
  const viewerNext = document.getElementById('viewerNext');
  const viewerDownload = document.getElementById('viewerDownload');
  const viewerRotate = document.getElementById('viewerRotate');
  const viewerFullscreen = document.getElementById('viewerFullscreen');
  const viewerStage = document.getElementById('viewerStage');

  let photos = []; // {name, src, size, type, width, height}
  let currentIndex = 0;
  let rotateDeg = 0;

  // 格式化大小 - 照抄 PhotoCard
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024*1024) return `${Math.round(bytes/1024)}KB`;
    return `${(bytes/1024/1024).toFixed(1)}MB`;
  }
  function formatName(name) {
    const i = name.lastIndexOf('.');
    return i>0 ? name.slice(0,i) : name;
  }
  function totalSize() {
    return photos.reduce((a,b)=>a+b.size,0);
  }

  async function loadManifest() {
    try {
      const res = await fetch('images.json?_=' + Date.now());
      if (!res.ok) throw new Error('no manifest');
      const data = await res.json();
      // 兼容两种格式：数组 或 {albums}
      if (Array.isArray(data)) photos = data;
      else if (data.albums) photos = data.albums.flatMap(a=>a.images.map(n=>({name:n, src:`images/${encodeURIComponent(n)}`, size:0, type:n.split('.').pop()})));
      else photos = [];
    } catch (e) {
      // fallback: 尝试按 23 个固定文件加载
      console.warn('images.json 缺失，使用兜底探测');
      photos = [];
      empty.classList.remove('hidden');
      loader.classList.add('hidden');
      return;
    }
    // 补齐 width/height 占位, 后续通过 Image 加载获取真实尺寸
    photos.forEach(p=>{
      if (!p.src) p.src = `images/${encodeURIComponent(p.name)}`;
      // 解码显示
      p.displayName = p.name;
    });
  }

  function renderMasonry() {
    masonry.innerHTML = '';
    if (!photos.length) {
      empty.classList.remove('hidden');
      loader.classList.add('hidden');
      photoCount.textContent = '0 张照片';
      return;
    }
    empty.classList.add('hidden');
    photoCount.textContent = `${photos.length} 张照片`;
    photoSize.textContent = formatSize(totalSize());

    photos.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'masonry-item group';
      item.dataset.index = idx;

      // 用真实图片作为预览，Pixtale 会区分 thumbnail/preview/key，这里静态直接用原图
      // 为了瀑布流高度不跳动，先不固定高度，让图片 natural 高度决定（CSS columns 自动）
      const img = document.createElement('img');
      img.loading = idx < 8 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = p.name;
      img.src = p.src;
      img.onerror = () => { item.style.display='none'; };

      // 记录宽高用于 meta
      img.onload = () => {
        p.width = img.naturalWidth;
        p.height = img.naturalHeight;
        // 更新对应 info 中的尺寸
        const metaEl = item.querySelector('.meta-size');
        if (metaEl) metaEl.textContent = `${p.width} × ${p.height}`;
      };

      const info = document.createElement('div');
      info.className = 'masonry-info';
      info.innerHTML = `
        <h3>${escapeHtml(formatName(p.name))}</h3>
        <div class="meta">
          <span>${p.type.toUpperCase()}</span>
          <span>·</span>
          <span class="meta-size">${p.width?`${p.width}×${p.height}`:''}</span>
          <span>·</span>
          <span>${formatSize(p.size)}</span>
        </div>
      `;

      item.appendChild(img);
      item.appendChild(info);
      item.addEventListener('click', () => openViewer(idx));
      // 长按在移动端显示 hover（抄 Pixtale 的 touchHover）
      let timer = null;
      item.addEventListener('contextmenu', e=>{
        if (window.innerWidth >= 1024) return;
        e.preventDefault();
        item.classList.toggle('show-hover');
      });
      item.addEventListener('touchstart', ()=>{
        timer = setTimeout(()=> item.classList.add('show-hover'), 400);
      }, {passive:true});
      item.addEventListener('touchend', ()=>{
        clearTimeout(timer);
        setTimeout(()=> item.classList.remove('show-hover'), 2000);
      });

      masonry.appendChild(item);
    });
    loader.classList.add('hidden');
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // Viewer 逻辑 抄 yet-another-react-lightbox 的交互
  function openViewer(idx){
    currentIndex = idx;
    rotateDeg = 0;
    viewerImg.style.transform = 'rotate(0deg)';
    viewer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    history.pushState({viewer:true}, '', location.href);
    renderViewer();
    renderThumbs();
  }
  function closeViewer(){
    viewer.classList.add('hidden');
    document.body.style.overflow = '';
    if (history.state && history.state.viewer) history.back();
  }
  window.addEventListener('popstate', ()=>{
    if (!viewer.classList.contains('hidden')) {
      viewer.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  function renderViewer(){
    const p = photos[currentIndex];
    if (!p) return;
    viewerImg.src = p.src;
    viewerImg.alt = p.name;
    viewerName.textContent = formatName(p.name);
    viewerMeta.textContent = `${p.type.toUpperCase()} · ${p.width?`${p.width} × ${p.height} · `:''}${formatSize(p.size)}`;
    viewerIndex.textContent = `${currentIndex+1} / ${photos.length}`;
    // 高亮缩略图
    [...viewerThumbs.children].forEach((el,i)=> el.classList.toggle('active', i===currentIndex));
    // 滚动到当前缩略图可见
    const active = viewerThumbs.children[currentIndex];
    if (active) active.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
  }

  function renderThumbs(){
    viewerThumbs.innerHTML = '';
    photos.forEach((p, idx)=>{
      const div = document.createElement('div');
      div.className = 'thumb' + (idx===currentIndex?' active':'');
      div.innerHTML = `<img src="${p.src}" alt="" loading="lazy">`;
      div.addEventListener('click', ()=>{ currentIndex=idx; rotateDeg=0; viewerImg.style.transform='rotate(0deg)'; renderViewer(); });
      viewerThumbs.appendChild(div);
    });
  }

  function prev(){ if (currentIndex>0) { currentIndex--; rotateDeg=0; viewerImg.style.transform='rotate(0deg)'; renderViewer(); } }
  function next(){ if (currentIndex<photos.length-1) { currentIndex++; rotateDeg=0; viewerImg.style.transform='rotate(0deg)'; renderViewer(); } }

  // 下载当前图 - 完全静态可用
  async function downloadCurrent(){
    const p = photos[currentIndex];
    if (!p) return;
    try {
      const res = await fetch(p.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = p.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // fallback 直接链接下载
      const a = document.createElement('a');
      a.href = p.src;
      a.download = p.name;
      a.click();
    }
  }

  // 事件绑定
  viewerClose.addEventListener('click', closeViewer);
  viewerBg.addEventListener('click', closeViewer);
  viewerPrev.addEventListener('click', prev);
  viewerNext.addEventListener('click', next);
  viewerDownload.addEventListener('click', downloadCurrent);
  viewerRotate.addEventListener('click', ()=>{
    rotateDeg = (rotateDeg + 90) % 360;
    viewerImg.style.transform = `rotate(${rotateDeg}deg)`;
  });
  viewerFullscreen.addEventListener('click', ()=>{
    if (!document.fullscreenElement) viewer.requestFullscreen();
    else document.exitFullscreen();
  });
  // 点击主图切换工具栏显隐（抄 Pixtale 的 showActions）
  viewerStage.addEventListener('click', (e)=>{
    if (e.target === viewerStage || e.target === viewerImg) {
      document.getElementById('viewerToolbar').classList.toggle('opacity-0');
      document.getElementById('viewerBottom').classList.toggle('opacity-0');
    }
  });
  document.addEventListener('keydown', (e)=>{
    if (viewer.classList.contains('hidden')) return;
    if (e.key==='Escape') closeViewer();
    if (e.key==='ArrowLeft') prev();
    if (e.key==='ArrowRight') next();
  });
  // 触摸滑动切换
  let sx=0;
  viewerStage.addEventListener('touchstart', e=> sx=e.touches[0].clientX, {passive:true});
  viewerStage.addEventListener('touchend', e=>{
    const dx = e.changedTouches[0].clientX - sx;
    if (dx < -50) next();
    if (dx > 50) prev();
  });

  if (regenBtn) regenBtn.addEventListener('click', async ()=>{
    regenBtn.textContent='加载中...';
    await loadManifest();
    renderMasonry();
    renderThumbs();
    regenBtn.textContent='重新加载';
  });

  // 初始化
  (async ()=>{
    await loadManifest();
    renderMasonry();
  })();

  // 欢迎弹窗关闭
  const introModal = document.getElementById('introModal');
  const introClose = document.getElementById('introClose');
  const introBackdrop = document.getElementById('introBackdrop');
  if (introClose) introClose.addEventListener('click', closeIntro);
  if (introBackdrop) introBackdrop.addEventListener('click', closeIntro);
  function closeIntro() {
    if (!introModal) return;
    introModal.style.opacity = '0';
    introModal.style.transition = 'opacity .3s ease';
    setTimeout(() => introModal.style.display = 'none', 300);
  }
})();
