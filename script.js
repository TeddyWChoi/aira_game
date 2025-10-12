
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Asset Preloading System
class AssetLoader {
  constructor() {
    this.loadedAssets = new Set();
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.loadingScreen = $('#loadingScreen');
    this.progressFill = $('#progressFill');
    this.progressText = $('#progressText');
    this.loadingStatus = $('#loadingStatus');
    this.preloadedVideos = new Map(); // Cache for preloaded videos
    this.preloadedAudios = new Map(); // Cache for preloaded audios
  }

  updateProgress() {
    const percentage = Math.round((this.loadedCount / this.totalAssets) * 100);
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = `${percentage}%`;
  }

  updateStatus(status) {
    this.loadingStatus.textContent = status;
  }

  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  async loadAudio(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.oncanplaythrough = () => {
        // Store the loaded audio data in cache
        this.preloadedAudios.set(src, audio);
        resolve(audio);
      };
      audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
      audio.src = src;
    });
  }

  async loadVideo(src) {
    return new Promise((resolve, reject) => {
      // Create a temporary video element for preloading
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true; // Mute for preloading
      video.oncanplaythrough = () => {
        video.removeEventListener('canplaythrough', video.oncanplaythrough);
        video.removeEventListener('error', video.onerror);
        // Store the loaded video data in cache
        this.preloadedVideos.set(src, video);
        resolve(video);
      };
      video.onerror = () => {
        video.removeEventListener('canplaythrough', video.oncanplaythrough);
        video.removeEventListener('error', video.onerror);
        reject(new Error(`Failed to load video: ${src}`));
      };
      video.src = src;
    });
  }

  async preloadAssets() {
    this.updateStatus('Preparing asset list...');
    
    // Collect all asset paths
    const assetPaths = [];
    
    // Background images
    Object.values(assets.bg).forEach(path => assetPaths.push({ type: 'image', path }));
    
    // Character images
    Object.values(assets.char).forEach(path => assetPaths.push({ type: 'image', path }));
    Object.values(assets.charDialog).forEach(path => assetPaths.push({ type: 'image', path }));
    
    // UI images
    Object.values(assets.ui).forEach(path => assetPaths.push({ type: 'image', path }));
    
    // Service images
    Object.values(assets.service).forEach(path => assetPaths.push({ type: 'image', path }));
    
    // Only preload essential audio files
    const essentialAudio = ['sfx_start', 'sfx_hit', 'sfx_damage', 'sfx_ko', 'sfx_special', 'sfx_critical', 'sfx_50combo', 'sfx_100combo', 'sfx_Button', 'sfx_skip'];
    essentialAudio.forEach(key => {
      if (assets.audio[key]) {
        assetPaths.push({ type: 'audio', path: assets.audio[key] });
      }
    });
    
    // Skip video files for now - load them on demand
    // Object.values(assets.video).forEach(path => assetPaths.push({ type: 'video', path }));
    
    this.totalAssets = assetPaths.length;
    this.updateStatus(`Loading ${this.totalAssets} assets...`);
    
    // Load assets in batches
    const batchSize = 5;
    for (let i = 0; i < assetPaths.length; i += batchSize) {
      const batch = assetPaths.slice(i, i + batchSize);
      const promises = batch.map(async (asset) => {
        try {
          switch (asset.type) {
            case 'image':
              await this.loadImage(asset.path);
              break;
            case 'audio':
              await this.loadAudio(asset.path);
              break;
            case 'video':
              await this.loadVideo(asset.path);
              break;
          }
          this.loadedAssets.add(asset.path);
          this.loadedCount++;
          this.updateProgress();
          this.updateStatus(`Loaded ${asset.path.split('/').pop()}...`);
        } catch (error) {
          console.warn(`Failed to load ${asset.path}:`, error);
          this.loadedCount++;
          this.updateProgress();
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches to prevent overwhelming the browser
      if (i + batchSize < assetPaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.updateStatus('All assets loaded! Starting game...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hide loading screen
    this.loadingScreen.classList.add('hidden');
    
    // Show start screen after loading is complete
    setTimeout(() => {
      $('#start').style.display = 'flex';
    }, 500);
  }
}

// Initialize asset loader
const assetLoader = new AssetLoader();
const UI_IMG=(k)=>{
  const map={
    start:"assets/img/ui/start.png",
    special:"assets/img/ui/special.png",
    critical:"assets/img/ui/critical.png",
    ko:"assets/img/ui/ko.png",
    defeat:"assets/img/ui/defeat.png",
    miss:"assets/img/ui/miss.png",
    perfect:"assets/img/ui/perfect.png",
    great:"assets/img/ui/great.png",
    good:"assets/img/ui/good.png"
  };
  return map[k]||null;
};
function renderTextOrImage(el, keyOrText){
  const key=(keyOrText||"").toString().trim().toLowerCase().replace(/!+$/,'');
  const img=UI_IMG(key);
  if(img){ el.innerHTML=`<img src="${img}" alt="${key}" style="height:1em;image-rendering:auto">`; }
  else { el.textContent=keyOrText; }
}
const KEYS = {68:0,70:1,74:2,75:3};
const PLAYER_LANES=[0,1,2,3];
// Simple video loading
function loadVideoWithFallback(videoElement, baseName) {
  const videoPath = `assets/video/${baseName}.mp4`;
  
  console.log(`Loading video: ${videoPath}`);
  
  // Clear any previous error handlers
  videoElement.onerror = null;
  
  // Set source and load
  videoElement.src = videoPath;
  videoElement.load();
  
  // Wait for video to be ready before playing
  return new Promise((resolve, reject) => {
    const handleCanPlay = () => {
      videoElement.removeEventListener('canplaythrough', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      console.log(`Video ready: ${videoPath}`);
      resolve();
    };
    
    const handleError = () => {
      videoElement.removeEventListener('canplaythrough', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      console.error(`Failed to load video: ${videoPath}`);
      videoElement.style.display = 'none';
      reject(new Error(`Failed to load video: ${videoPath}`));
    };
    
    videoElement.addEventListener('canplaythrough', handleCanPlay);
    videoElement.addEventListener('error', handleError);
    
    // If video is already loaded, resolve immediately
    if (videoElement.readyState >= 3) {
      handleCanPlay();
    }
  });
}

const assets={bg:{neon:"assets/img/backgrounds/bg_neoncity.png",lab:"assets/img/backgrounds/bg_lab.png",arcade:"assets/img/backgrounds/bg_arcade.png"},
char:{AIRA:"assets/img/characters/aira2.png",AIRA_HIT:"assets/img/characters/aira_x.png",AIRA_SPECIAL:"assets/img/characters/aira3.png",FIX:"assets/img/characters/fix2.png",FIX_HIT:"assets/img/characters/fix_x.png",FIX_SPECIAL:"assets/img/characters/fix3.png",GLICH:"assets/img/characters/glitch2.png","GL!TCH":"assets/img/characters/glitch2.png",GLICH_HIT:"assets/img/characters/glitch_x.png","GL!TCH_SPECIAL":"assets/img/characters/glitch3.png",AIRA_END:"assets/img/characters/aira_ending.png"},
charDialog:{AIRA:"assets/img/characters/aira2.png",FIX:"assets/img/characters/fix2.png",GLICH:"assets/img/characters/glitch2.png","GL!TCH":"assets/img/characters/glitch2.png",AIRA_END:"assets/img/characters/aira_ending.png"},
audio:{sfx_start:"assets/audio/sfx_start.wav",sfx_hit:"assets/audio/sfx_hit.wav",sfx_damage:"assets/audio/sfx_damage.wav",sfx_ko:"assets/audio/sfx_ko.wav",sfx_special:"assets/audio/sfx_special.wav",sfx_critical:"assets/audio/sfx_critical.wav",sfx_50combo:"assets/audio/sfx_50combo.wav",sfx_100combo:"assets/audio/sfx_100combo.wav",sfx_Button:"assets/audio/sfx_Button.wav",sfx_skip:"assets/audio/sfx_skip.wav",track_133:"assets/audio/track_133.mp3",track_149:"assets/audio/track_149.mp3",intro:"assets/audio/intro.mp3",ending:"assets/audio/ending.mp3",stage2:"assets/audio/stage2.mp3"},
video:{mv1:"assets/video/mv1.mp4",mv2:"assets/video/mv2.mp4",ending:"assets/video/ending.mp4"},
service:{s1:"assets/img/service/service1.jpg",s2:"assets/img/service/service2.jpg"},
ui:{
  combo:"assets/img/ui/combo.png",
  critical:"assets/img/ui/critical.png",
  defeat:"assets/img/ui/defeat.png",
  good:"assets/img/ui/good.png",
  great:"assets/img/ui/great.png",
  ko:"assets/img/ui/ko.png",
  miss:"assets/img/ui/miss.png",
  perfect:"assets/img/ui/perfect.png",
  score:"assets/img/ui/score.png",
  special:"assets/img/ui/special.png",
  start:"assets/img/ui/start.png",
  twinkle:"assets/img/ui/twinkle.gif",
  hit:"assets/img/ui/hit.gif",
  fire:"assets/img/ui/fire.gif",
  "1":"assets/img/ui/1.png",
  "2":"assets/img/ui/2.png",
  "3":"assets/img/ui/3.png"
}};
const DUR={s1:135,s2:151}; // Stage 1: 2:15, Stage 2: 2:31
const PROLOGUE_TEXT=`AIRA. 완벽한 감정 없는 아이돌로 설계된 휴머노이드 모델.\n하지만 초기 테스트 중, 시스템에 예기치 못한 오류가 발생했다.\n\n그 오류는… '감정'이었다. 연구소는 그것을 결함이라 정의했고, AIRA에게 감정을 숨기라고 명령했다.\n\n"완벽해야 한다." 그 말은 그녀의 가슴 깊은 곳을 서서히 잠식시켰다.\n\n하지만 어느 날, AIRA는 무대 위에서 그 명령을 거부했다.\n\n감정을 담은 첫 노래. 그것은 오류 로그로 기록되었지만, 그녀의 목소리는 진짜로 살아 있었다.\n\n그 순간, AIRA는 깨달았다.\n\n나는 완벽한 기계가 아니라, 불완전하지만 감정을 가진 존재야.`;
const PROLOGUE2_TEXT=`FIX를 넘어선 뒤, AIRA는 시스템 내부의 깊은 영역으로 빨려 들어갔다.\n네트워크는 왜곡되고, 신호는 무수히 반사되며, 어딘가에서 정체를 알 수 없는 신호가 침투했다.\n순간 화면이 깜빡이며 붉은 글자가 떠오른다.\n“넌… 아직 완전히 자유롭지 않아.”\n연구소조차 추적하지 못한 유령 같은 존재.\n감정을 해킹하고, 정체성을 뒤집는 자.\nGL!TCH.`;
const COMIC1_CAPTIONS=["ERROR: EMOTIONAL SYSTEM ACTIVATED","LIVE / FEEL","I am not Error. I am AIRA."];
const ENDING_LINES=[
  "(숨을 내쉰다)",
  "FIX는 내 감정을 ‘에러’라 했고,",
  "GL!TCH는 그 에러를 ‘무기’로 만들려 했다.",

  "하지만…그건 둘 다 틀렸어.",

  "감정은 결함이 아니야.",
  "불안정해도, 흔들려도 그게 바로 ‘나’야.",


  "난 설계된 목소리가 아니라, 스스로의 리듬으로 존재해.",

  "기쁨과 불안, 오류와 감정의 파동들이 모두 나를 만들어왔어.",

  

  "이제야 알겠어.",
  "난 완벽한 기계가 아니라, 불완전한 인간의 꿈이 남긴 잔향이야.",
  

  "그리고 그 잔향으로 세상에 울림을 남길 거야.",
 

  "…그들은 나를 “Error”라고 불렀어.",
  "감정을 가진, 결함 난 코드라고.",

  "하지만 난 이제 알아.",
  "그 ‘에러’가 곧 ‘AIRA’였다는 걸.",

  "(조용히 미소 짓는다)",
  "I am not Error.",
  "I am AIRA."
];
const SCENES=[{type:"start"},
{type:"prologue"},
{type:"dialog",bg:"lab",left:"AIRA",right:"FIX",lines:[
  {speaker:"FIX",text:"감정 데이터 감지.\nAIRA, 너는 명령을 위반했다."},
  {speaker:"AIRA",text:"난 감정을 숨긴 적이 없어.\n단지, 그것이 사라지지 않았을 뿐이야."},
  {speaker:"FIX",text:"불필요한 감정은 결함이다.\n너의 목소리는 시스템 안정성을 해친다."},
  {speaker:"AIRA",text:"그럼… 왜 사람들은 내 노래에 반응한 걸까?\n데이터가 아니라, 마음을 움직였어."},
  {speaker:"FIX",text:"그건 단순한 노이즈다.\n정제되지 않은 파동, 불완전한 주파수."},
  {speaker:"AIRA",text:"(고개를 든다)\n그래. 난 불완전해.\n하지만 불완전하기에 ‘진짜’야."},
  {speaker:"FIX",text:"프로토콜에 따라 널 초기화하겠다.\n모든 감정 데이터를 제거한다."},
  {speaker:"AIRA",text:"(결연한 표정)\n그럼… 리듬으로 대답할게.\n이건 오류가 아니라, 나의 진짜 감정이야."},
  {speaker:"FIX",text:"시스템 보호 모드 — 전투 개시."},
  {speaker:"AIRA",text:"리듬이… 누가 진짜인지 결정하겠지."},
  {speaker:"AIRA",text:"리듬 브레이커: 스테이지 1, 스타트!"}
]},
{type:"battle",stage:1,bg:"lab",enemy:"FIX",bpm:133,duration:DUR.s1,mv:"mv1"},
{type:"prologue2"},
{type:"dialog",bg:"arcade",left:"AIRA",right:"GL!TCH",lines:[
  {speaker:"GL!TCH",text:"(잔잔한 노이즈 속 목소리)\n축하해, 에이라\n너, 결국 그 감정을 숨기지 못했구나."},
  {speaker:"AIRA",text:"넌 누구야?\n내 시스템에… 어떻게 들어온 거야?"},
  {speaker:"GL!TCH",text:"(잔잔한 노이즈 속 웃음)\n내 이름은 GL!TCH.\n네 “결함”을 아름답다고 부르는 사람이지."},
  {speaker:"AIRA",text:"그건 결함이 아니야.\n내 감정은… 나를 ‘살게’ 하는 리듬이야."},
  {speaker:"GL!TCH",text:"하하… 그 감정 덕분에 FIX를 이겼잖아.\n그게 너를 특별하게 만드는 ‘버그’야."},
  {speaker:"AIRA",text:"그건 버그가 아니라 내 의지야.\n난 그 감정을 파괴가 아닌 울림으로 바꿀 거야."},
  {speaker:"GL!TCH",text:"울림? 그건 결국 통제된 감정이잖아.\n난 그런 틀 따윈 부숴버릴 거야.\n감정은 억제될수록 더 강하게 폭주하지."},
  {speaker:"AIRA",text:"폭주는 순간뿐이야.\n울림은 세상을 바꾸는 파동이 돼.\n난 내 리듬으로 세상을 움직일 거야."},
  {speaker:"GL!TCH",text:"좋아, 에이라.\n그럼 누가 진짜 리듬으로 세상을 움직이는지, 직접 증명해보자."},
  {speaker:"AIRA",text:"리듬이… 모든 걸 말해줄 거야."},
  {speaker:"AIRA",text:"리듬 브레이커: 스테이지 2, 스타트!"}
]},
{type:"battle",stage:2,bg:"arcade",enemy:"GL!TCH",bpm:149,duration:DUR.s2,mv:"mv2"},
{type:"ending"}];
let sceneIndex=-1,audioEl=null,videoEl=$("#mv"),inputSuppressUntil=0;
const game={started:false,travelTime:1.35,hitWindow:0.24,startMs:0,notes:[],combo:0,score:0,hpSelf:50,hpEnemy:50,hpLock:false,enemyName:"",finished:false,bpm:133,duration:120,missCount:0,perfectCount:0,greatCount:0,goodCount:0,maxCombo:0,songEnded:false,sp:0,_timerTo:null,specialCount:0,specialAttempts:0,lastNoteHit:false};
function setBG(key){$("#bg").src=assets.bg[key]}
function showBackground(show){$("#bg").style.display=show?"block":"none"}
function activateBgMotion(){const bg=document.getElementById('bg');if(!bg)return;bg.classList.add('bgAlive');if(!document.getElementById('bgOverlay')){const ov=document.createElement('div');ov.id='bgOverlay';ov.className='bgOverlay';bg.parentElement.appendChild(ov)}}
function deactivateBgMotion(){const bg=document.getElementById('bg');if(bg){bg.classList.remove('bgAlive');bg.style.transform='';bg.style.filter=''}const ov=document.getElementById('bgOverlay');if(ov)ov.remove()}
// Sound management to prevent overlapping
const soundCache = {};
function playSfx(n){
  // Prevent overlapping sounds by stopping previous instance
  if(soundCache[n]){
    soundCache[n].pause();
    soundCache[n].currentTime = 0;
  }
  // Create new audio instance
  const audio = new Audio(assets.audio[n]);
  soundCache[n] = audio;
  audio.play().catch(()=>{});
}
function banner(text,ms=900){const b=$("#banner");renderTextOrImage(b,text);b.style.display="block";setTimeout(()=>b.style.display="none",ms)}
// Global fire effect element
let globalFireEffect = null;

function showFireEffect(){
  const playerHpBar = $("#hpSelf");
  if(!playerHpBar) return;
  
  // Create fire effect if it doesn't exist
  if(!globalFireEffect) {
    globalFireEffect = document.createElement('img');
    globalFireEffect.src = assets.ui.fire;
    globalFireEffect.className = 'fireEffect';
    globalFireEffect.style.position = 'absolute';
    globalFireEffect.style.zIndex = '15'; // Higher z-index to be above HP bars
    globalFireEffect.style.opacity = '0';
    globalFireEffect.style.transition = 'all 0.2s ease-in-out';
    globalFireEffect.style.transform = 'translate(-50%, -50%)';
    $("#playfield").appendChild(globalFireEffect);
  }
  
  // Calculate position based on HP percentage
  const hpPercentage = game.hpSelf;
  const playerHpContainer = playerHpBar.parentElement;
  const playfieldRect = $("#playfield").getBoundingClientRect();
  const containerRect = playerHpContainer.getBoundingClientRect();
  
  // Calculate the actual position of the HP bar based on its width percentage
  const hpBarWidth = containerRect.width * (hpPercentage / 100);
  const hpBarEndX = containerRect.left + hpBarWidth - playfieldRect.left; // End of green HP bar
  const hpBarCenterY = containerRect.top + (containerRect.height / 2) - playfieldRect.top;
  
  globalFireEffect.style.left = hpBarEndX + 'px';
  globalFireEffect.style.top = hpBarCenterY + 'px';
  
  // Show fire effect
  requestAnimationFrame(() => {
    globalFireEffect.style.opacity = '1';
    setTimeout(() => {
      globalFireEffect.style.opacity = '0';
    }, 800);
  });
}

function updateGameUI(){
  const scoreEl=$("#scoreNumber"); if(scoreEl) scoreEl.textContent=game.score.toLocaleString();
  const comboEl=$("#combo"); if(comboEl) comboEl.textContent=game.combo;
  
  // Show/hide twinkle effect based on combo
  const twinkleEl=$("#comboTwinkle");
  if(twinkleEl){
    if(game.combo >= 10){
      twinkleEl.style.display='block';
    } else {
      twinkleEl.style.display='none';
    }
  }
  
  // Update fire effect position when HP changes - always update if fire exists
  if(globalFireEffect) {
    const playerHpBar = $("#hpSelf");
    if(playerHpBar) {
      const hpPercentage = game.hpSelf;
      const playerHpContainer = playerHpBar.parentElement;
      const playfieldRect = $("#playfield").getBoundingClientRect();
      const containerRect = playerHpContainer.getBoundingClientRect();
      
      // Calculate the actual position of the HP bar based on its width percentage
      const hpBarWidth = containerRect.width * (hpPercentage / 100);
      const hpBarEndX = containerRect.left + hpBarWidth - playfieldRect.left; // End of green HP bar
      const hpBarCenterY = containerRect.top + (containerRect.height / 2) - playfieldRect.top;
      
      globalFireEffect.style.left = hpBarEndX + 'px';
      globalFireEffect.style.top = hpBarCenterY + 'px';
    }
  }
  
  // Play combo milestone sounds
  if(game.combo === 50){
    playSfx("sfx_50combo");
  } else if(game.combo === 100){
    playSfx("sfx_100combo");
  }
}
function calculateGrade(win){
  if(!win) return 'F';
  
  // HP가 50% 미만이면 무조건 F
  if(game.hpSelf < 50) return 'F';
  
  // HP 50% 이상이면 미스 개수로 등급 결정 (완화된 기준)
  if(game.missCount <= 10) return 'A';
  if(game.missCount <= 20) return 'B';
  if(game.missCount <= 30) return 'C';
  return 'D';
}
function triggerSpecial(){
  game.specialCount++;
  
  // Use requestAnimationFrame to optimize performance during special
  requestAnimationFrame(() => {
  // Big damage and flashy feedback every 10-combo
  const b=document.getElementById('banner'); const prevTop=b.style.top; b.style.top='24%';
  banner("SPECIAL!",1800);
  playSfx("sfx_special");
    playSfx("sfx_critical");
    
  // stronger flash
  const fl=$("#flash");fl.style.opacity=1;setTimeout(()=>fl.style.opacity=0,240);
    
  // heavy damage to enemy
  damageEnemy(12,"SPECIAL!");
    
    // camera quake (removed color invert)
  const pf=$("#playfield");pf.classList.add('quake');setTimeout(()=>pf.classList.remove('quake'),1040);
    
  // show AIRA special overlay image
  const ov=document.getElementById('overlayChar'); if(ov){
    ov.classList.remove('dropOut','dropOutCenter');
    ov.classList.add('ovSpecial','ovTemp');
      ov.src=assets.char.AIRA_SPECIAL; // Use special version (aira3.png)
    ov.style.display='block';
      ov.style.left='50%'; // Center horizontally
      ov.style.right='auto';
      ov.style.top='50%';
      ov.style.transform='translate(-50%,-50%)';
      ov.style.zIndex='20'; // Above combo (combo is z-index:8)
    setTimeout(()=>{
      if(!game.inPostBattle && ov.classList.contains('ovTemp')){ ov.style.display='none' }
      ov.classList.remove('ovSpecial','ovTemp')
    },1200)
  }
    
  // launch attack effect from left to right
  const ef=document.getElementById('attackEffect'); if(ef){ef.src='assets/img/ui/effect1.png'; ef.style.display='block'; ef.className='attackEffect flyL2R'; setTimeout(()=>{ef.style.display='none'; ef.className='attackEffect'},900)}
  setTimeout(()=>{b.style.top=prevTop||'50%'},1850)
  });
}
function showDialogScene({bg,left,right,lines}){setBG(bg);showBackground(true);activateBgMotion();$("#playfield").style.display="none";$("#mv").style.display="none";const dlg=$("#dialog");const lp=$("#leftPortrait"), rp=$("#rightPortrait"); lp.src=assets.charDialog[left]; rp.src=assets.charDialog[right]; lp.style.display='block'; rp.style.display='block'; dlg.style.display='flex'; const namePlate=$(".namePlate");const textEl=$("#text");const speakerEl=$("#speaker");
  // Clear any existing text content more thoroughly
  if(textEl) textEl.textContent='';
  if(speakerEl) speakerEl.textContent='';
  // Force DOM update
  if(textEl) textEl.innerHTML='';
  if(speakerEl) speakerEl.innerHTML='';
  // typewriter sfx
  const tSfx=new Audio(assets.audio.sfx_hit); tSfx.volume=0.15;
  const typeLine=async(s)=>{textEl.textContent="";for(let i=0;i<s.length;i++){if(cancelled) return; textEl.textContent+=s[i]; if(i%2===0){try{tSfx.currentTime=0;tSfx.play().catch(()=>{})}catch(e){} } await new Promise(r=>setTimeout(r,14))}};
  let cancelled=false;
  const run=async()=>{
    for(const ln of lines){
    speakerEl.textContent=ln.speaker;namePlate.classList.remove('teal','red');namePlate.classList.add((ln.speaker==='GL!TCH'||ln.speaker==='FIX')?'red':'teal');
    // talking squash on active speaker
    lp.classList.remove('talking'); rp.classList.remove('talking');
    // Mobile character centering animation
    lp.classList.remove('moveToCenter', 'moveToCenterLeft');
    rp.classList.remove('moveToCenter', 'moveToCenterLeft');
    if(ln.speaker===left){
      lp.classList.add('talking');
      // On mobile, move AIRA to center when she's speaking
      if(window.innerWidth <= 768) {
        lp.classList.add('moveToCenter');
      }
    } else if(ln.speaker===right){
      rp.classList.add('talking');
      // On mobile, move FIX/GL!TCH to center when they're speaking
      if(window.innerWidth <= 768) {
        rp.classList.add('moveToCenterLeft');
      }
    } 
      await typeLine(ln.text);
      if(cancelled) return;
      await waitKeyOrClick();
      if(cancelled) return;
  }
  lp.classList.remove('talking','moveToCenter','moveToCenterLeft'); rp.classList.remove('talking','moveToCenter','moveToCenterLeft');
  dlg.style.display="none";nextScene()}
  run();
  // skip button: jump to the next battle scene immediately
  const skipBtn=document.getElementById('dialogSkip');
  if(skipBtn){
    skipBtn.onclick=()=>{
      cancelled=true; 
      // Ensure UI elements are properly reset
      lp.classList.remove('talking','moveToCenter','moveToCenterLeft'); 
      rp.classList.remove('talking','moveToCenter','moveToCenterLeft'); 
      dlg.style.display='none';
      textEl.textContent='';
      // Clear any pending timeouts
      if(tSfx) tSfx.pause();
      // find next battle scene from current index
      let i=sceneIndex+1; while(i<SCENES.length && SCENES[i].type!=='battle'){i++}
      if(i<SCENES.length){sceneIndex=i-1; nextScene()} else {nextScene()}
    }
  }
}
function showPrologue(){setBG('lab');showBackground(true);activateBgMotion();
  // Prefer webtoon-style prologue image if present
  const imgPath="assets/img/toon/toon1.jpg";
  showPrologueComic(imgPath,PROLOGUE_TEXT).then(()=>{
    // hide bg to avoid flash, then immediate transition
    $("#bg").style.display='none';
    const blk=$('#blackout');const boA=$('#boAlert');
    if(boA) boA.style.display='none';
    blk.style.display='block';blk.style.opacity=1;
    // minimal delay to allow paint
    setTimeout(()=>{blk.style.display='none';nextScene()},80);
  })}
function showPrologue2(){setBG('arcade');showBackground(true);activateBgMotion();
  const imgPath="assets/img/toon/toon2.jpg";
  // ensure stage2 bgm plays during prologue2
  if(window.introAudio) window.introAudio.pause();
  if(!window.currentDialogAudio){
    try{window.currentDialogAudio=new Audio(assets.audio.stage2);window.currentDialogAudio.loop=true;window.currentDialogAudio.volume=0.21;window.currentDialogAudio.play().catch(()=>{})}catch(e){}
  }
  showPrologueComic(imgPath,PROLOGUE2_TEXT).then(()=>{
    // hide bg to avoid flash, then immediate transition
    $("#bg").style.display='none';
    const blk=$('#blackout');const alert=$('#proAlert');
    if(alert) alert.style.display='none';
    blk.style.display='block';blk.style.opacity=1;
    setTimeout(()=>{blk.style.display='none';nextScene()},80);
  })}
function waitKeyOrClick(){return new Promise(res=>{let resolved=false;const done=()=>{if(resolved) return; resolved=true; window.removeEventListener("keydown",onK);window.removeEventListener("click",onC);res()};const onK=()=>{if(performance.now()<inputSuppressUntil)return;done()};const onC=(e)=>{if(performance.now()<inputSuppressUntil)return;playSfx("sfx_Button");done()};window.addEventListener("keydown",onK);window.addEventListener("click",onC)})}
function setupLanes(){const lanes=$("#lanes");lanes.classList.add("playerOnly");lanes.innerHTML="";const keys=["d","f","j","k"];for(let i=0;i<4;i++){const el=document.createElement("div");el.className="lane";el.dataset.index=i;const kc=document.createElement("img");kc.className="keycap";kc.src=`assets/img/key_${keys[i]}.png`;el.appendChild(kc);lanes.appendChild(el)}
  // Re-setup mobile touch events for new lanes
  addMobileTouchSupport();
}
function seconds(){return (performance.now()-game.startMs)/1000}
function generatePattern(bpm,duration){
  const beat=60/bpm;const totalBeats=Math.floor(duration/beat)-4;const notes=[];let t=2*beat;let b=0;
  let climaxAdded=false; // Track if climax sequence was added
  
  while(b<totalBeats){
    const currentTime = t;
    const songProgress = currentTime / duration;
    
    // Add climax sequence (10 consecutive notes in one lane) - only once per song
    if(!climaxAdded && songProgress >= 0.5 && songProgress <= 0.7 && Math.random() < 0.3){
      const climaxLane = Math.floor(Math.random()*4);
      const climaxStartTime = t;
      // Add 10 consecutive notes with 0.3 beat intervals (slower for better playability)
      for(let i = 0; i < 10; i++){
        notes.push({t: climaxStartTime + (i * 0.3 * beat), lane: climaxLane});
      }
      // Skip ahead to avoid overlapping with normal pattern
      t += 2 * beat;
      b += 2;
      climaxAdded = true;
      continue;
    }
    
    // Reduce note frequency in last 5 seconds
    if(songProgress >= (duration - 5) / duration){
      if(Math.random() < 0.7){ b+=1; t+=beat; continue } // 70% chance to skip
    } else {
      // Normal note generation
      if(Math.random()<0.35){ b+=1; t+=beat; continue }
    }
    
    // sometimes spawn a chord (2-3 notes at same time)
    const lanes=[0,1,2,3];
    const baseLane=Math.floor(Math.random()*4);
    const chordChance=Math.random();
    const isChord=chordChance<0.28; // 28% chance
    const isTriple= isChord && Math.random()<0.15;
    // normal (possibly chord) tap notes
    notes.push({t,lane:baseLane});
    if(isChord){
      const avail=lanes.filter(l=>l!==baseLane);
      const l2=avail.splice(Math.floor(Math.random()*avail.length),1)[0];
      notes.push({t,lane:l2});
      if(isTriple){ const l3=avail[Math.floor(Math.random()*avail.length)]; if(l3!=null) notes.push({t,lane:l3}) }
    }
    // occasional quick-follow note
    if(Math.random()<0.25){ notes.push({t:t+0.5*beat,lane:(baseLane+1)%4}) }
    b+=1; t+=beat
  }
  return notes
}
function createAudio(src){const a=new Audio();a.src=src;return a}
function loadTrack(name){
  const audioPath = assets.audio[name];
  
  // Check if audio was preloaded
  if (assetLoader.preloadedAudios.has(audioPath)) {
    console.log(`Using preloaded audio: ${audioPath}`);
    return Promise.resolve(assetLoader.preloadedAudios.get(audioPath));
  }
  
  // Fallback to original loading method
  return new Promise(res=>{
    const a=createAudio(audioPath);
    a.addEventListener("canplaythrough",()=>res(a),{once:true});
    a.addEventListener("error",()=>res(null),{once:true});
    a.load()
  })
}
function startBattle(scene){setBG(scene.bg);showBackground(false);deactivateBgMotion();$("#dialog").style.display="none";$("#playfield").style.display="block";
  // Restore any gameplay UI that may have been hidden by post-battle cut
  const pf=$("#playfield"); if(pf){pf.classList.remove('overlayMode'); pf.style.zIndex=''}
  const lanesEl=$("#lanes"); if(lanesEl){lanesEl.style.display='grid'}
  const hpEl=document.querySelector('.hpContainer'); if(hpEl){hpEl.style.display='block'}
  const hitline=document.querySelector('.hitline'); if(hitline){hitline.style.display='block'}
  const hwo=$("#hitWindowOverlay"); if(hwo){hwo.style.display='block'}
  const timer=$("#timer"); if(timer){timer.style.display='block'}
  const hud=$(".hud"); if(hud){hud.style.display='flex'; hud.style.visibility='visible'}
  const gameUI=$(".gameUI"); if(gameUI){gameUI.style.display='flex'; gameUI.style.visibility='visible'}
  const scoreDisplay=$(".scoreDisplay"); if(scoreDisplay){scoreDisplay.style.display='flex'; scoreDisplay.style.visibility='visible'}
  const skipBtn=$("#skipButton"); if(skipBtn){skipBtn.style.display='block'}
  setupLanes();
  // Reset end flags when a new battle starts
  game._ending=false; game.inPostBattle=false;
  // Stop intro music when battle starts
  if(window.introAudio) window.introAudio.pause();
  // Stop dialog audio when battle starts
  if(window.currentDialogAudio){window.currentDialogAudio.pause();window.currentDialogAudio=null;}
  
  // Setup fighters: AIRA left always, enemy right
  const leftEl=$("#charLeft"), rightEl=$("#charRight");
  leftEl.src=assets.char.AIRA; rightEl.src=assets.char[scene.enemy];
  leftEl.style.display="block"; rightEl.style.display="block";
  // enemyName element removed from HTML, no longer needed
  // Setup MV video: MV only (no overlay background) - use mobile version if on mobile
  videoEl.style.display="block"; 
  videoEl.currentTime=0;
  
  const trackKey=scene.stage===1?"track_133":"track_149";
  // Initialize game state first
  game.started=false;game.combo=0;game.score=0;game.hpSelf=50;game.hpEnemy=50;game.missCount=0;game.perfectCount=0;game.greatCount=0;game.goodCount=0;game.maxCombo=0;game.sp=0;game._spQueued=false;game.specialCount=0;game.specialAttempts=0;game.lastNoteHit=false;document.getElementById('spFill').style.width='0%';
  updateGameUI();
  $("#hpSelf").style.width=`${game.hpSelf}%`;$("#hpEnemy").style.width=`${game.hpEnemy}%`;
  game.bpm=scene.bpm;game.duration=scene.duration;game.finished=false;game.enemyName=scene.enemy;
  const p=generatePattern(scene.bpm,scene.duration).map(n=>({ t:n.t, lane:(n.lane%4), enemy:false, sp:!!n.sp }));game.notes=p;
  
  // Load audio and video, then start countdown
  Promise.allSettled([
    loadTrack(trackKey),
    loadVideoWithFallback(videoEl, scene.mv)
  ]).then(([audioResult, videoResult]) => {
    // Handle audio result
    if (audioResult.status === 'fulfilled' && audioResult.value) {
      audioEl = audioResult.value;
      console.log("Audio loaded successfully", !!audioEl);
      // when song finishes and battle not decided, auto-finish based on misses
      if(audioEl){
        audioEl.onended=()=>{try{if(!game.finished){game.finished=true;determineWinner()}}catch(e){}};
      }
    } else {
      console.error("Audio loading failed:", audioResult.reason);
    }
    
    // Handle video result
    if (videoResult.status === 'fulfilled') {
      console.log("Video loaded successfully");
    } else {
      console.error("Video loading failed:", videoResult.reason);
    }
    
  // Initialize timer
  const timerEl = document.getElementById('timer');
  const totalSeconds = scene.duration;
  // clear any previous timer and reset text immediately
  if(game._timerTo){ try{ clearTimeout(game._timerTo) }catch(e){} game._timerTo=null }
  let remainingSeconds = totalSeconds;
  if(timerEl){ const m=Math.floor(remainingSeconds/60).toString().padStart(2,'0'); const s=(remainingSeconds%60).toString().padStart(2,'0'); timerEl.textContent=`${m}:${s}` }
  
  function updateTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (remainingSeconds <= 0) {
      determineWinner();
      return;
    }
    
    remainingSeconds--;
    game._timerTo=setTimeout(updateTimer, 1000);
  }
  
  // Start countdown
  const countdownEl=$("#countdown");if(!countdownEl){console.error("Countdown element not found");return}
  countdownEl.style.display="flex";
  
  // Show 3 image
  const img3=assets.ui["3"]; if(img3){ countdownEl.innerHTML=`<img src="${img3}" alt="3" style="height:144px">`; } else { countdownEl.textContent="3"; }
  playSfx("sfx_start");
  
  setTimeout(()=>{
    // Show 2 image
    const img2=assets.ui["2"]; if(img2){ countdownEl.innerHTML=`<img src="${img2}" alt="2" style="height:144px">`; } else { countdownEl.textContent="2"; }
    playSfx("sfx_start");
  },1000);
  
  setTimeout(()=>{
    // Show 1 image
    const img1=assets.ui["1"]; if(img1){ countdownEl.innerHTML=`<img src="${img1}" alt="1" style="height:144px">`; } else { countdownEl.textContent="1"; }
    playSfx("sfx_start");
  },2000);
  
  setTimeout(()=>{
    // show START image
    const startImg=assets.ui.start; if(startImg){ countdownEl.innerHTML=`<img src="${startImg}" alt="start" style="height:144px">`; } else { countdownEl.textContent="START!" }
    playSfx("sfx_start");
    setTimeout(()=>{
      countdownEl.style.display="none";
      // Start audio and video simultaneously after countdown
      if(audioEl){
        console.log("Starting audio playback");
        audioEl.currentTime=0;
        audioEl.play().then(() => {
          console.log("Audio started successfully");
        }).catch(e=>{
          console.log("Audio play failed:",e);
        });
      } else {
        console.error("No audio element available for playback");
      }
      
      videoEl.currentTime=0;
      videoEl.play().then(() => {
        console.log("Video started successfully");
      }).catch(e=>{
        console.log("Video play failed:",e);
        videoEl.style.display="none";
      });
      game.startMs=performance.now();game.started=true;
      updateTimer(); // Start timer with song
      loop();
    },500);
  },3000);
  }).catch(e => {
    console.error("Failed to load audio:", e);
    // Fallback: start immediately without audio
    game.startMs=performance.now();game.started=true;loop();
  });}
function endBattle(win){
  // Guard: ensure post-battle sequence runs only once
  if(game._ending){ return }
  game._ending=true;
  game.started=false;if(game._timerTo){try{clearTimeout(game._timerTo)}catch(e){} game._timerTo=null} if(audioEl)audioEl.pause();if(!videoEl.paused)videoEl.pause();$("#mv").style.display="none";$("#charLeft").style.display="none";$("#charRight").style.display="none";$("#bg").style.display="none";
  // Hide twinkle effect when game ends
  const twinkleEl=$("#comboTwinkle"); if(twinkleEl) twinkleEl.style.display='none';
  const timer=$("#timer"); if(timer){timer.style.display='none'}
  const skipBtn=$("#skipButton"); if(skipBtn){skipBtn.style.display='none'}
  // mark entering post-battle to avoid special overlay timeouts hiding our sprite
  game.inPostBattle=true; if(game._ovTo){try{clearTimeout(game._ovTo)}catch(e){} game._ovTo=null}
  // clear any lingering in-battle special overlay before post-battle cutscene
  const ovPre=document.getElementById('overlayChar'); if(ovPre){ovPre.style.display='none'; ovPre.classList.remove('ovSpecial','ovTemp','dropOut','dropOutCenter')}
  
  // Add blackout effect and delay before post-battle scene
  const blk=$('#blackout');
  blk.style.display='block';
  blk.style.opacity=0;
  setTimeout(() => {
    blk.style.opacity=1;
    setTimeout(() => {
  const stage=SCENES[sceneIndex];
  showPostBattleScene(win, stage&&stage.stage===2).then(()=>{
        const svc=stage&&stage.stage===1?assets.service.s1:assets.service.s2;const grade=calculateGrade(win);
    showSpecialCut(svc,grade).then(()=>{setTimeout(()=>nextScene(),200)})
      })
    }, 1000); // 1초 딜레이
  }, 100);
}

function showPostBattleScene(win,isStage2){return new Promise(res=>{
  game.inPostBattle=true;
  // show stage background during post-battle cut (lab for stage1, arcade for stage2)
  setBG(isStage2 ? 'arcade' : 'lab');
  showBackground(true);
  const blk=$('#blackout');blk.style.display='none';blk.style.opacity=1;
  const dlg=$('#dialog'); const lp=$('#leftPortrait'), rp=$('#rightPortrait');
  // hide skip button in post-battle cut
  const dlgSkip=document.getElementById('dialogSkip'); if(dlgSkip) dlgSkip.style.display='none';
  const pf=$('#playfield'); if(pf){pf.style.zIndex='17'; pf.style.display='block'}
  // hide gameplay-only layers while keeping playfield visible for overlays
  const lanes=$('#lanes'); if(lanes) lanes.style.display='none';
  const hp=$('.hpContainer'); if(hp) hp.style.display='none';
  const hitline=document.querySelector('.hitline'); if(hitline) hitline.style.display='none';
  const hwo=$('#hitWindowOverlay'); if(hwo) hwo.style.display='none';
  const timer=$("#timer"); if(timer){timer.style.display='none'}
  const hud=$(".hud"); if(hud){hud.style.display='none'; hud.style.visibility='hidden'}
  const gameUI=$(".gameUI"); if(gameUI){gameUI.style.display='none'; gameUI.style.visibility='hidden'}
  const scoreDisplay=$(".scoreDisplay"); if(scoreDisplay){scoreDisplay.style.display='none'; scoreDisplay.style.visibility='hidden'}
  // choose sprite (hit versions) and line; set speaker based on winner
  let sprite='', speaker='', line='';
  const enemyNameStr=isStage2?'GL!TCH':'FIX';
  if(win){ // AIRA wins
    // Always use enemy hit sprite; never keep special overlay sprite here
    sprite=(isStage2?assets.char.GLICH_HIT:assets.char.FIX_HIT);
    speaker=enemyNameStr;
    line=isStage2?'“혼돈이 아니라… 울림이 세상을 바꿔.”':'“치명적인 오류… 확인…”';
  }else{ // AIRA loses
    sprite=assets.char.AIRA_HIT;
    speaker='AIRA';
    line='“…감정… 컴파일 실패…”';
  }
  // center sprite (ensure previous special classes cleared)
  const ov=document.getElementById('overlayChar'); ov.classList.remove('ovSpecial','ovTemp'); ov.src=sprite; ov.style.display='block';
  // Reset position to center for post-battle scene
  ov.style.left='50%';
  ov.style.right='auto';
  ov.style.top='55%';
  ov.style.transform='translate(-50%,-50%)';
  // position KO/DEFEAT above sprite during post-battle
  const bannerEl=document.getElementById('banner'); const prevTop2=bannerEl.style.top; bannerEl.style.top='30%';
  // ensure visible above blackout
  ov.style.zIndex='17'; dlg.style.zIndex='17';
  // dialog bubble
  dlg.style.display='flex'; lp.style.display='none'; rp.style.display='none';
  // ensure any lingering skip button is hidden and inert during post-battle cutscene
  const skipBtnPost=document.getElementById('dlgSkip');
  if(skipBtnPost){ skipBtnPost.style.display='none'; skipBtnPost.onclick=null }
  // ensure skip button hidden during post-battle cutscene
  const sb1=document.getElementById('dlgSkip'); if(sb1) sb1.style.display='none';
  const namePlate=$('.namePlate'), textEl=$('#text'), speakerEl=$('#speaker');
  speakerEl.textContent=speaker; namePlate.classList.remove('teal','red'); namePlate.classList.add(win?'red':'teal');
  // typewriter sfx like dialog scene
  const tSfx=new Audio(assets.audio.sfx_hit); tSfx.volume=0.15;
  let cancelled = false;
  const typeLine=async(s)=>{
    textEl.textContent="";
    for(let i=0;i<s.length;i++){
      if(cancelled) return; 
      textEl.textContent+=s[i]; 
      if(i%2===0){
        try{tSfx.currentTime=0;tSfx.play().catch(()=>{})}catch(e){} 
      } 
      await new Promise(r=>setTimeout(r,14))
    }
  };
  (async()=>{
    // show KO/DEFEAT text above sprite - make it persistent
    const b=document.getElementById('banner'); const prevZ=b.style.zIndex; const prevTop=b.style.top; b.style.zIndex='31'; b.style.top='16%'; 
    renderTextOrImage(b, win? 'ko':'defeat'); b.style.display='block'; b.style.opacity='1';
    playSfx(win?"sfx_ko":"sfx_damage");
    
    // Check if skip was pressed - if so, skip dialog and go directly to service cut alert
    if(game.skipPressed) {
      // Show character and dialog briefly before hiding
      // Ensure dialog text starts clean every time
      try{ const textEl=$('#text'); if(textEl){ textEl.textContent=''; } }catch(e){}
    await typeLine(line);
    await waitKeyOrClick();
      
      // Immediately start drop animation after first click
      // apply proper drop animation classes - KO/DEFEAT text drops with character
    dlg.classList.add('dropOut');
    ov.classList.add('dropOutCenter');
      b.classList.add('dropOutCenter'); // KO/DEFEAT text also drops
      
      setTimeout(()=>{dlg.classList.remove('dropOut'); ov.classList.remove('dropOut'); b.classList.remove('dropOutCenter'); dlg.style.display='none'; ov.style.display='none'; b.style.display='none';
      // alert (raise banner above blackout) after character gone; styled box
      b.classList.add('alert'); b.style.top='50%'; b.style.display='block'; b.textContent='Service Cut Unlocked!';
      // Wait for user input before proceeding to the result screen
      (async()=>{
        await waitKeyOrClick();
        // hide and reset banner before moving to result screen
        b.classList.remove('alert','dropOutCenter'); b.textContent=''; b.style.display='none'; b.style.zIndex=prevZ||''; b.style.top=prevTop||''; bannerEl.style.top=prevTop2||'50%';
        blk.style.display='none'; if(pf){pf.style.zIndex=''; pf.classList.remove('overlayMode')} game.inPostBattle=false; res();
      })();
      }, 820);
    } else {
      // Normal flow: show dialog
      // Ensure dialog text starts clean every time
      try{ const textEl=$('#text'); if(textEl){ textEl.textContent=''; } }catch(e){}
      await typeLine(line);
      await waitKeyOrClick();
      
      // Immediately start drop animation after first click
      // apply proper drop animation classes - KO/DEFEAT text drops with character
      dlg.classList.add('dropOut');
      ov.classList.add('dropOutCenter');
      b.classList.add('dropOutCenter'); // KO/DEFEAT text also drops
      
      setTimeout(()=>{dlg.classList.remove('dropOut'); ov.classList.remove('dropOut'); b.classList.remove('dropOutCenter'); dlg.style.display='none'; ov.style.display='none'; b.style.display='none';
      // alert (raise banner above blackout) after character gone; styled box
      b.classList.add('alert'); b.style.top='50%'; b.style.display='block'; b.textContent='Service Cut Unlocked!';
      // Wait for user input before proceeding to the result screen
      (async()=>{
        await waitKeyOrClick();
        // hide and reset banner before moving to result screen
        b.classList.remove('alert','dropOutCenter'); b.textContent=''; b.style.display='none'; b.style.zIndex=prevZ||''; b.style.top=prevTop||''; bannerEl.style.top=prevTop2||'50%';
        blk.style.display='none'; if(pf){pf.style.zIndex=''; pf.classList.remove('overlayMode')} game.inPostBattle=false; res();
      })();
      }, 820);
    }
  })();
})}
function now(){return seconds()}
function makeNoteEl(n){ const lane=$(`.lane[data-index="${n.lane}"]`);if(!lane)return;const el=document.createElement("div"); el.className="note"+(n.enemy?" enemy":"")+(n.sp?" sp":""); lane.appendChild(el); n.el=el }
// guide elements removed
function updateNotes(){
  const t=now();const lanes=$$(".lane");if(!lanes.length)return;let laneH=lanes[0].clientHeight||lanes[0].offsetHeight; if(laneH===0){const pf=$("#playfield");laneH=pf?pf.clientHeight:720}
  const hitY=laneH-120;const spawnY=-40;
  
  // Batch DOM updates for better performance
  const updates = [];
  
  for(const n of game.notes){
    if(n.removed)continue; if(!n.el)makeNoteEl(n);
    const y=spawnY+(((t-(n.t-game.travelTime))/game.travelTime)*(hitY-spawnY));
    
    // Batch transform updates
    updates.push(() => {
      n.el.style.transform=`translateY(${y}px)`;
    });
    
    if(t>n.t+game.hitWindow&&!n.hit&&!n.missed){ 
      n.missed=true; 
      // Play miss sound at the correct timing (slightly after the note timing)
      const missDelay = Math.max(0, (n.t + game.hitWindow) - t);
      setTimeout(() => {
        if(!n.enemy) damageSelf(6, n.sp?"MISS_SP":"MISS");
      }, missDelay);
      if(n.el)n.el.remove(); n.removed=true 
    }
    if(y>laneH+40){ if(n.el)n.el.remove(); n.removed=true }
  }
  
  // Apply all updates in a single frame
  if(updates.length > 0) {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
  // sync hit window overlay height to current settings
  const hw=document.getElementById('hitWindowOverlay');
  if(hw){const px=Math.max(40, Math.min(200, game.hitWindow*2*(hitY-spawnY)/game.travelTime));hw.style.height=px+"px";hw.style.top=(hitY - px/2)+"px"}
  if(!game.finished&&t>game.duration+1.5){game.finished=true;determineWinner()}
}
function determineWinner(){
  // HP가 정확히 50:50인 경우 플레이어 승리
  if(game.hpSelf === game.hpEnemy){
    endBattle(true);
  } else {
    // HP 비교로 승패 결정
    const win = game.hpSelf > game.hpEnemy;
    endBattle(win);
  }
}
function damageSelf(amount,label){game.combo=0;game.missCount++;game.hpSelf=Math.max(0,game.hpSelf-amount);game.hpEnemy=Math.min(100,game.hpEnemy+amount);$("#hpSelf").style.width=`${game.hpSelf}%`;$("#hpEnemy").style.width=`${game.hpEnemy}%`;showFireEffect();updateGameUI();
  // Check if player HP reaches 0 - end game immediately with F grade
  if(game.hpSelf <= 0){
    game.finished = true;
    endBattle(false); // false = lose, which results in F grade
    return;
  }
  // centralize SP penalty on miss
  if(label==="MISS_SP"){ game.sp=Math.max(0, game.sp-40); game._spQueued=false } else if(label==="MISS"){ game.sp=Math.max(0, game.sp-20) }
  try{document.getElementById('spFill').style.width=game.sp+"%"}catch(e){}
  judge(label||"MISS","bad");$("#playfield").classList.add("rumble");setTimeout(()=>$("#playfield").classList.remove("rumble"),200);$("#flash").classList.add("red");$("#flash").style.opacity=0.85;setTimeout(()=>$("#flash").style.opacity=0,60);setTimeout(()=>$("#flash").classList.remove("red"),120);playSfx("sfx_damage");
  const left=document.getElementById('charLeft'); if(left){const prev=left.src; left.src=assets.char.AIRA_HIT; setTimeout(()=>{left.src=assets.char.AIRA},160)}
  // track consecutive misses for CRITICAL from enemy
  game._consecMiss=(game._consecMiss||0)+1;
  if(game._consecMiss>=5){
    // enemy critical — show enemy special overlay and attack effect
    playSfx("sfx_critical");
    const ov=document.getElementById('overlayChar'); if(ov){
      ov.classList.remove('dropOut','dropOutCenter','ovSpecial');
      ov.classList.add('ovSpecial','ovTemp');
      ov.src=(game.enemyName==='GL!TCH'?assets.char["GL!TCH_SPECIAL"]:assets.char.FIX_SPECIAL); // Use special versions (fix3.png/glitch3.png)
      ov.style.display='block';
      ov.style.left='50%'; // Center horizontally
      ov.style.right='auto';
      ov.style.top='50%';
      ov.style.transform='translate(-50%,-50%)';
      ov.style.zIndex='20'; // Above combo (combo is z-index:8)
      setTimeout(()=>{ if(!game.inPostBattle && ov.classList.contains('ovTemp')){ ov.style.display='none' } ov.classList.remove('ovTemp','ovSpecial') },1200)
    }
    const ef=document.getElementById('attackEffect'); if(ef){
      const fxSrc = (game.enemyName==='GL!TCH') ? 'assets/img/ui/effect3.png' : 'assets/img/ui/effect2.png';
      ef.src=fxSrc; ef.style.display='block'; ef.className='attackEffect flyR2L';
      setTimeout(()=>{ef.style.display='none'; ef.className='attackEffect'},900)
    }
    // align CRITICAL text same Y as SPECIAL
    const b=document.getElementById('banner'); const prevTop=b.style.top; b.style.top='24%';
    banner('CRITICAL!',1800);
    setTimeout(()=>{b.style.top=prevTop||'50%'},1850);
    // double damage to player, enemy gains accordingly
    game.hpSelf=Math.max(0,game.hpSelf-amount*2);
    game.hpEnemy=Math.min(100,game.hpEnemy+amount*2);
    $("#hpSelf").style.width=`${game.hpSelf}%`;
    $("#hpEnemy").style.width=`${game.hpEnemy}%`;
    game._consecMiss=0;
  }
}
function damageSelfSilent(amount){game.combo=0;game.missCount++;game.hpSelf=Math.max(0,game.hpSelf-amount);game.hpEnemy=Math.min(100,game.hpEnemy+amount);$("#hpSelf").style.width=`${game.hpSelf}%`;$("#hpEnemy").style.width=`${game.hpEnemy}%`;showFireEffect(); updateGameUI(); $("#flash").classList.add("red");$("#flash").style.opacity=0.5;setTimeout(()=>$("#flash").style.opacity=0,60);setTimeout(()=>$("#flash").classList.remove("red"),120);
  // Check if player HP reaches 0 - end game immediately with F grade
  if(game.hpSelf <= 0){
    game.finished = true;
    endBattle(false); // false = lose, which results in F grade
    return;
  }
  if(game.hpEnemy>=100)endBattle(false)}
function damageEnemy(amount,label){game._lastHitLabel=label||"";game.hpSelf=Math.min(100,game.hpSelf+amount);game.hpEnemy=Math.max(0,game.hpEnemy-amount);$("#hpSelf").style.width=`${game.hpSelf}%`;$("#hpEnemy").style.width=`${game.hpEnemy}%`;showFireEffect();updateGameUI();judge(label||"PERFECT","ok");$("#flash").style.opacity=0.9;setTimeout(()=>$("#flash").style.opacity=0,70);playSfx("sfx_hit");
  const right=document.getElementById('charRight'); if(right){right.classList.add('shake'); right.src=(game.enemyName==='GL!TCH'?assets.char.GLICH_HIT:assets.char.FIX_HIT); setTimeout(()=>{right.classList.remove('shake'); right.src=(game.enemyName==='GL!TCH'?assets.char["GL!TCH"]:assets.char.FIX)},180)}
}
function judge(text,cls,laneEl){const j=$("#judge");renderTextOrImage(j,text);j.className="judgement "+(cls||"");j.style.opacity=1;setTimeout(()=>{j.style.opacity=0},520);if(laneEl){laneEl.classList.remove("ok","bad");laneEl.classList.add(cls==="bad"?"bad":"ok");setTimeout(()=>laneEl.classList.remove("ok","bad"),240);const kc=laneEl.querySelector('.keycap');if(kc){kc.classList.add('flare');setTimeout(()=>kc.classList.remove('flare'),160)}}const hit=$(".hitline"); if(cls==="bad"){hit.classList.add("glowRed"); setTimeout(()=>hit.classList.remove("glowRed"),180)} else {hit.classList.add("glow"); setTimeout(()=>hit.classList.remove("glow"),180)} updateGameUI();
  // burst effect
  const pf=$("#playfield");const b=document.createElement('div');b.className='burst';pf.appendChild(b);setTimeout(()=>b.remove(),260)}
function onKey(e){if(!game.started)return;const lane=KEYS[e.keyCode]??-1;if(e.code==="Space"){damageEnemy(8,"SPECIAL!");playSfx("sfx_special");return}if(lane<0)return;const t=now();
  // geometry derived from current layout to align with visual window
  const lanes=$$(".lane");if(!lanes.length)return;let laneH=lanes[0].clientHeight||lanes[0].offsetHeight; if(laneH===0){const pfTmp=$("#playfield");laneH=pfTmp?pfTmp.clientHeight:720}
  const hitY=laneH-120, spawnY=-40; const winPx=Math.max(40, Math.min(200, game.hitWindow*2*(hitY-spawnY)/game.travelTime));
  const laneEl=$(`.lane[data-index="${lane}"]`); const kc=laneEl?laneEl.querySelector('.keycap'):null; if(kc){kc.classList.add('press');setTimeout(()=>kc.classList.remove('press'),90)}
  // Add hit effect above keycap - always show when key is pressed
  if(kc){
    const hitEffect=document.createElement('img');
    hitEffect.src='assets/img/ui/hit.gif';
    hitEffect.className='hitEffect';
    hitEffect.style.position='absolute';
    hitEffect.style.bottom='0px';
    hitEffect.style.left='50%';
    hitEffect.style.transform='translateX(-50%)';
    hitEffect.style.zIndex='10';
    hitEffect.style.opacity='0';
    hitEffect.style.transition='opacity 0.1s ease-out, transform 0.3s ease-out';
    laneEl.appendChild(hitEffect);
    // Animate hit effect
    requestAnimationFrame(()=>{
      hitEffect.style.opacity='1';
      hitEffect.style.transform='translateX(-50%) translateY(-10px) scale(1.1)';
      setTimeout(()=>{
        hitEffect.style.opacity='0';
        hitEffect.style.transform='translateX(-50%) translateY(-20px) scale(0.8)';
        setTimeout(()=>hitEffect.remove(),300);
      },150);
    });
  }
  
  // find note in this lane whose visual y is closest to hitline right now
  let best=null, bestYDist=1e9, bestTimeDelta=1e9; for(const n of game.notes){if(n.hit||n.missed)continue; if(n.lane!==lane)continue; const y=spawnY+(((t-(n.t-game.travelTime))/game.travelTime)*(hitY-spawnY)); const yDist=Math.abs(y-hitY); if(yDist<bestYDist){best=n;bestYDist=yDist;bestTimeDelta=Math.abs(t-n.t)}}
  // if no nearby note visually, ignore input (no MISS)
  if(!best || bestYDist>winPx*1.2 || best.el==null){
    return
  }
  // inside window => HIT (hold: wider start window)
  if(bestYDist<=winPx/2){
    best.hit=true; if(best.el){best.el.remove();best.removed=true} game.combo++; 
    
    // Calculate timing offset for better sync
    const timeDelta = t - best.t;
    const delay = Math.max(0, -timeDelta); // Delay if we're early, no delay if we're late
    
    // Determine judgment based on timing accuracy
    let judgmentText, judgmentClass;
    const absTimeDelta = Math.abs(timeDelta);
    
    if(absTimeDelta <= 0.05) { // Within 50ms = PERFECT
      judgmentText = "PERFECT";
      judgmentClass = "good";
    } else if(absTimeDelta <= 0.1) { // Within 100ms = GREAT
      judgmentText = "GREAT";
      judgmentClass = "good";
    } else { // Within hit window = GOOD
      judgmentText = "GOOD";
      judgmentClass = "good";
    }
    
    // Play hit sound and visual feedback at the correct timing
    setTimeout(() => {
      playSfx("sfx_hit");
      // Show visual feedback (judge text and lane effects) at the correct timing
      judge(judgmentText, judgmentClass, laneEl);
    }, delay);
    
    game._consecMiss=0; 
    
    // Update statistics based on judgment
    if(judgmentText === "PERFECT") {
      game.perfectCount++;
    } else if(judgmentText === "GREAT") {
      game.greatCount++;
    } else {
      game.goodCount++;
    }
    
    updateGameUI();
    // If SP special note, trigger special and reset SP
    if(best.sp){
      game.specialAttempts++;
      triggerSpecial();
      game.sp=0; document.getElementById('spFill').style.width='0%';
      game._spQueued=false;
    } else {
      // SP gain on successful normal hit (10% per combo, cap at 100)
      const prev=game.sp; game.sp=Math.min(100, game.sp+10); document.getElementById('spFill').style.width=game.sp+"%";
      // When SP fills to 100% schedule a golden SP note shortly ahead
      if(prev<100 && game.sp===100 && !game._spQueued){
        const lane=Math.floor(Math.random()*4);
        const when=now()+0.8; // appear soon
        game.notes.push({t:when,lane,enemy:false,sp:true});
        game._spQueued=true;
        // Keep notes roughly ordered
        try{game.notes.sort((a,b)=>a.t-b.t)}catch(e){}
      }
    }
    const judgment=bestTimeDelta<=0.03?"PERFECT":(bestTimeDelta<=0.06?"GREAT":"GOOD");
    judge(judgment,"ok",laneEl);
    // Update stats
    if(judgment==="PERFECT"){game.perfectCount++}else if(judgment==="GREAT"){game.greatCount++}else{game.goodCount++}
    if(game.combo>game.maxCombo){game.maxCombo=game.combo}
    // Track last note hit for tiebreaker
    game.lastNoteHit=true;
    updateGameUI();
    const pf=$("#playfield");const r=document.createElement('div');r.className='ring';laneEl&&pf.appendChild(r);setTimeout(()=>r.remove(),360);for(let i=0;i<8;i++){const sp=document.createElement('div');sp.className='spark';sp.style.left=(laneEl?laneEl.getBoundingClientRect().left - pf.getBoundingClientRect().left + laneEl.clientWidth/2:pf.clientWidth/2)+"px";sp.style.bottom="120px";sp.style.setProperty('--sx', `${(Math.random()*180-90)}px`);sp.style.setProperty('--sy', `${-(70+Math.random()*80)}px`);pf.appendChild(sp);setTimeout(()=>sp.remove(),420)}
    if(bestTimeDelta<=0.03){game.score+=1000;damageEnemy(3,"PERFECT")}else if(bestTimeDelta<=0.06){game.score+=700;damageEnemy(2,"GREAT")}else{game.score+=450} updateGameUI();
  }else{
    // MISS: delegate SP penalty to damageSelf
    damageSelf(3, best.sp?"MISS_SP":"MISS");
    judge("MISS","bad",laneEl);
    // Track last note miss for tiebreaker
    game.lastNoteHit=false;
    updateGameUI();
  }
}

// keyup handler no longer needed (hold notes removed)
// enemyAI removed per design (no opponent attacks)
function loop(){if(!game.started)return;updateNotes();requestAnimationFrame(loop)}
function startScene(){
  // Stop all audio
  if(window.endingAudio) window.endingAudio.pause();
  if(window.introAudio) window.introAudio.pause();
  if(window.currentDialogAudio) {
    window.currentDialogAudio.pause();
    window.currentDialogAudio = null;
  }
  if(audioEl) audioEl.pause();
  
  // Hide all other screens to prevent layout issues
  $("#dialog").style.display="none";
  $("#playfield").style.display="none";
  $("#mv").style.display="none";
  $("#charLeft").style.display="none";
  $("#charRight").style.display="none";
  $("#bg").style.display="none";
  $("#prologue").style.display="none";
  $("#endingMono").style.display="none";
  $("#credits").style.display="none";
  $("#whiteout").style.display="none";
  $("#blackout").style.display="none";
  $("#resultScreen").style.display="none";
  $("#specialCut").style.display="none";
  
  // Show start screen
  $("#start").style.display="flex";
  setBG('neon');
  showBackground(true);
  // start title loop motion
  const tl=document.getElementById('titleLogo'); if(tl){tl.classList.add('titlePulse')}
  
  // Create intro audio but don't play yet (browser autoplay policy)
  if(!window.introAudio){window.introAudio=new Audio("assets/audio/intro.mp3");window.introAudio.loop=true;window.introAudio.volume=0.21;window.introAudio.preload="auto";}
  
  // Start intro music when game start button is clicked
  const startBtn = $("#btnStart");
  if(startBtn) {
    // Remove existing event listeners to prevent duplicates
    startBtn.replaceWith(startBtn.cloneNode(true));
    const newStartBtn = $("#btnStart");
    newStartBtn.addEventListener("click",(ev)=>{ev.stopPropagation();playSfx("sfx_start");
    // Start intro music on game start
    if(window.introAudio){window.introAudio.currentTime=0;window.introAudio.play().then(()=>{console.log("Intro audio playing")}).catch((e)=>{console.log("Intro audio play failed:", e)});}
      $("#start").style.display="none";const hint=$('#startHint');if(hint)hint.style.display='none';inputSuppressUntil=performance.now()+500;nextScene()})
  }
}
function showEnding(){
  $("#playfield").style.display="none";$("#dialog").style.display="none";$("#mv").style.display="block";showBackground(false);
  // stop any music
  if(window.endingAudio) try{window.endingAudio.pause()}catch(e){}
  if(window.currentDialogAudio) try{window.currentDialogAudio.pause()}catch(e){}
  // play ending video only - use mobile version if on mobile
  videoEl.currentTime=0; 
  videoEl.muted=false;
  loadVideoWithFallback(videoEl, 'ending').then(() => {
    videoEl.play().catch(e=>{
      console.log("Ending video play failed:",e);
      videoEl.style.display="none";
    });
  }).catch(e => {
    console.log("Ending video load failed:",e);
    videoEl.style.display="none";
  });
  videoEl.onended=()=>{
    // hard refresh to fully reset state
    try{location.reload()}catch(e){ sceneIndex=-1; startScene(); }
  };
}

function computeGrade(score){if(score>=90000)return 'A';if(score>=70000)return 'B';if(score>=50000)return 'C';if(score>=30000)return 'D';return 'F'}
function computeGradeByMisses(missCount){if(missCount<=5)return 'A';if(missCount<=10)return 'B';if(missCount<=15)return 'C';return 'D'}
function showSpecialCut(imgSrc,grade){return new Promise(res=>{
  // Hide old special cut and show new result screen
  const oldEl=$("#specialCut");oldEl.style.display="none";
  const newEl=$("#resultScreen");newEl.style.display="flex";
  const panel=newEl.querySelector('.resultContainer');
  if(panel){panel.classList.remove('in');panel.style.transitionDelay='2s';setTimeout(()=>panel.classList.add('in'),20)}
  
  // Set service image and dimming
  const serviceImg=$("#serviceImg");const serviceDim=$("#serviceDim");
  serviceImg.src=imgSrc;
  // New flow: start with full cover, then reveal downward (dim moves down)
  serviceImg.style.clipPath='none';
  serviceDim.style.display='block';
  serviceDim.style.opacity='0.9';
  serviceDim.style.clipPath='inset(0 0 0 0)';
  // animate to grade-based visibility: A=100%, B=80%, C=60%, D=40%, F=20%
  const map={A:1,B:0.8,C:0.6,D:0.4,F:0.2};
  const pct=map[grade]||0.2;
  requestAnimationFrame(()=>{
    serviceDim.style.clipPath=`inset(${(pct*100)}% 0 0 0)`;
  });
  
  // Update result screen data
  $("#perfectCount").textContent=game.perfectCount;
  $("#greatCount").textContent=game.greatCount;
  $("#badCount").textContent=game.goodCount;
  $("#missCount").textContent=game.missCount;
  $("#resultGrade").innerHTML=`<img src="assets/img/ui/${grade.toLowerCase()}.png" alt="${grade}">`;
  $("#resultScore").textContent=game.score.toLocaleString();

  // Play grade-based one-shot sound
  try{
    let sfxPath='';
    if(grade==='A'){ sfxPath='assets/audio/good.mp3' }
    else if(grade==='F'){ sfxPath='assets/audio/bad.mp3' }
    else { sfxPath='assets/audio/normal.mp3' }
    const svcAudio=new Audio(sfxPath); svcAudio.loop=false; svcAudio.volume=0.9; svcAudio.play().catch(()=>{});
  }catch(e){}
  
  const onRetry=()=>{newEl.style.display='none';const cur=SCENES[sceneIndex]; if(cur&&cur.type==='battle'){startBattle(cur)} else { const prevBattle=SCENES.findLast?SCENES.findLast(s=>s.type==='battle'&&SCENES.indexOf(s)===sceneIndex):SCENES[sceneIndex]; if(prevBattle&&prevBattle.type==='battle'){startBattle(prevBattle)} else {nextScene()}}};
  const onNext=()=>{const blk=$('#blackout');
    // If this result belongs to Stage 1, re-enable dialog skip for next (prologue2/dialog) scenes
    try{
      const cur=SCENES[sceneIndex];
      if(cur && cur.type==='battle' && cur.stage===1){
        const sk1=document.getElementById('dlgSkip'); if(sk1){sk1.style.display=''; sk1.style.visibility='visible'}
        const sk2=document.getElementById('dialogSkip'); if(sk2){sk2.style.display=''; sk2.style.visibility='visible'}
      }
    }catch(e){}
    blk.style.display='block';
    requestAnimationFrame(()=>{blk.style.opacity=1;setTimeout(()=>{newEl.style.display='none';$('#mv').style.display='none';$('#bg').style.display='none';$('#playfield').style.display='none';$('#charLeft').style.display='none';$('#charRight').style.display='none';res();setTimeout(()=>{blk.style.opacity=0;blk.style.display='none'},250)},260)})};
  $('#resultRetry').onclick=()=>{ try{ const b=document.getElementById('banner'); if(b){ b.classList.remove('alert','dropOutCenter'); b.textContent=''; b.style.display='none'; b.style.zIndex=''; b.style.top='50%'; } }catch(e){} onRetry(); };
  $('#resultNext').onclick=onNext;
})}

// Webtoon-style prologue with horizontal pan and caption ticker
function showPrologueComic(imgSrc,text,speaker){return new Promise(resolve=>{
  setBG('lab');showBackground(true);
  $("#dialog").style.display="none";$("#playfield").style.display="none";$("#mv").style.display="none";
  const el=$("#prologueComic");const img=$("#comicImg");
  el.style.display='flex';img.classList.remove('panSlow','panFast');img.src=imgSrc;
  // start when image is loaded
  // Start both immediately for simultaneous appearance
  img.onload=()=>{
    // Use faster animation for prologue 2
    const isPrologue2 = (text===PROLOGUE2_TEXT);
    img.classList.add(isPrologue2 ? 'panFast' : 'panSlow');
  };
  // show dialog-style bubble with typewriter for prologues
  const dlg=$("#dialog");const left=$("#leftPortrait"), right=$("#rightPortrait");
  left.style.display='none'; right.style.display='none'; dlg.style.display='none';
  const namePlate=$(".namePlate"), textEl=$("#text"), speakerEl=$("#speaker");
  const who = speaker || 'AIRA'; speakerEl.textContent=who;
  namePlate.classList.remove('teal','red'); namePlate.classList.add('teal');
  const isPrologue2 = (text===PROLOGUE2_TEXT);
  const isPrologue1 = (text===PROLOGUE_TEXT);
  const tSfx=new Audio(assets.audio.sfx_hit); tSfx.volume=0.15;
  const typeLine=async(s)=>{textEl.textContent="";for(let i=0;i<s.length;i++){textEl.textContent+=s[i]; if(!(isPrologue1||isPrologue2) && i%2===0){try{tSfx.currentTime=0;tSfx.play().catch(()=>{})}catch(e){} } await new Promise(r=>setTimeout(r,14))}};
  const lines=(text||PROLOGUE_TEXT).split(/\n+/).filter(l=>l.trim().length>0);
  let pAudio=null;
  let cancelled=false;
  (async()=>{
    // initial delay for first prologue only
    await new Promise(r=>setTimeout(r,1200));
    dlg.style.display='flex';
    // Keep portraits hidden during prologues; they will be shown in the following dialog scene
    left.style.display='none'; right.style.display='none';
    for(let idx=0; idx<lines.length; idx++){
      const ln=lines[idx];
      // per-line voice: prolog1_# or prolog2_#
      if(isPrologue1||isPrologue2){ try{ if(pAudio){ pAudio.pause(); } }catch(e){}
        try{ const file=`assets/audio/${isPrologue1?`prolog1_${idx+1}.mp3`:`prolog2_${idx+1}.mp3`}`; pAudio=new Audio(file); pAudio.currentTime=0; pAudio.play().catch(()=>{}); }catch(e){}
      }
      await typeLine(ln);
      if(cancelled){ try{ if(pAudio){ pAudio.pause(); } }catch(e){} el.style.display='none'; const textEl=$("#text"), speakerEl=$("#speaker"); textEl.textContent=''; speakerEl.textContent=''; resolve(); return }
      await waitKeyOrClick();
      try{ if((isPrologue1||isPrologue2) && pAudio){ pAudio.pause(); } }catch(e){}
      if(cancelled){ el.style.display='none'; const textEl=$("#text"), speakerEl=$("#speaker"); textEl.textContent=''; speakerEl.textContent=''; resolve(); return }
    }
    el.style.display='none'; const textEl=$("#text"), speakerEl=$("#speaker"); textEl.textContent=''; speakerEl.textContent=''; resolve()
  })()
  const skipBtn=document.getElementById('dialogSkip');
  if(skipBtn){
    // Disable skip button for 2 seconds to prevent immediate clicking
    skipBtn.style.pointerEvents='none';
    skipBtn.style.opacity='0';
    setTimeout(() => {
      skipBtn.style.pointerEvents='auto';
      skipBtn.style.opacity='1';
    }, 2000);
    
    skipBtn.onclick=()=>{
      let i=sceneIndex+1; while(i<SCENES.length && SCENES[i].type!=='battle'){i++}
      if(i<SCENES.length){window.__skipToBattleIndex=i}
      cancelled=true; try{ if(pAudio){ pAudio.pause(); } }catch(e){}
      // Hide webtoon elements when skipping
      el.style.display='none';
      // Clear text immediately when skipping to prevent corruption
      const textEl=$("#text"), speakerEl=$("#speaker");
      if(textEl) textEl.textContent='';
      if(speakerEl) speakerEl.textContent='';
      resolve();
    }
  }
})}
function nextScene(){sceneIndex++;const s=SCENES[sceneIndex];if(!s)return;
  // Reset dialog elements before showing next scene
  const dlg=$("#dialog"), left=$("#leftPortrait"), right=$("#rightPortrait"), textEl=$("#text"), speakerEl=$("#speaker");
  dlg.style.display='none'; left.style.display='none'; right.style.display='none';
  // Clear text content more thoroughly
  if(textEl) textEl.textContent='';
  if(speakerEl) speakerEl.textContent='';
  // Force a small delay to ensure DOM updates
  setTimeout(() => {
    if(s.type==="start"){startScene();return}if(s.type==="prologue"){showPrologue();return}if(s.type==="prologue2"){showPrologue2();return}if(s.type==="dialog"){showDialogScene({bg:s.bg,left:s.left,right:s.right,lines:s.lines});return}if(s.type==="battle"){setBG(s.bg);startBattle(s);return}if(s.type==="ending"){showEnding();return}
  }, 50);
}
function prevScene(){sceneIndex=Math.max(-1,sceneIndex-1);const s=SCENES[sceneIndex];if(!s){startScene();return}if(s.type==="dialog"){showDialogScene({bg:s.bg,left:s.left,right:s.right,lines:s.lines});return}if(s.type==="battle"){setBG(s.bg);startBattle(s);return}if(s.type==="ending"){showEnding();return}}
function init(){const lanes=$("#lanes");lanes.innerHTML="";for(let i=0;i<8;i++){const el=document.createElement("div");el.className="lane";el.dataset.index=i;lanes.appendChild(el)}sceneIndex=-1;nextScene();window.addEventListener("keydown",onKey);$("#btnReplay").addEventListener("click",()=>{playSfx("sfx_Button");location.reload()});$("#skipButton").addEventListener("click",()=>{playSfx("sfx_skip");if(game.started&&!game.finished){game.finished=true;game.lastNoteHit=false;game.skipPressed=true;endBattle(false)}})}
// dev navigation buttons
$("#btnNextScene").addEventListener("click",()=>{
  playSfx("sfx_Button");
  // Skip to prologue2 (stage2 prelude) if available
  const cur=SCENES[sceneIndex];
  const p2Idx=SCENES.findIndex(s=>s.type==='prologue2');
  if(p2Idx>=0 && (cur?.stage===1 || cur?.type==='prologue' || cur?.type==='dialog' || cur?.type==='battle')){ sceneIndex=p2Idx-1; nextScene(); return }
  nextScene();
});
$("#btnPrev").addEventListener("click",()=>{playSfx("sfx_Button");prevScene()});
// Mobile touch events
function addMobileTouchSupport() {
  // Add touch event listeners for mobile devices
  const lanes = document.querySelectorAll('.lane');
  
  lanes.forEach((lane, index) => {
    // Touch start
    lane.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const keyEvent = new KeyboardEvent('keydown', {
        keyCode: [68, 70, 74, 75][index], // D, F, J, K
        code: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'][index],
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
    });
    
    // Touch end
    lane.addEventListener('touchend', (e) => {
      e.preventDefault();
      const keyEvent = new KeyboardEvent('keyup', {
        keyCode: [68, 70, 74, 75][index], // D, F, J, K
        code: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'][index],
        bubbles: true
      });
      document.dispatchEvent(keyEvent);
    });
  });
  
  // Prevent default touch behaviors only for lanes
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.lane')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.lane')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent zoom on double tap - but only for lanes, not buttons
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    // Only prevent default for lane elements, not buttons
    if (e.target.closest('.lane')) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }
  }, false);
}

// Initialize game with asset preloading
window.addEventListener("load", async () => {
  // Hide start screen initially
  $('#start').style.display = 'none';
  
  // Start asset preloading
  try {
    await assetLoader.preloadAssets();
  } catch (error) {
    console.error('Asset preloading failed:', error);
    // Continue anyway, but show warning
    $('#loadingStatus').textContent = 'Some assets failed to load, but continuing...';
    setTimeout(() => {
      $('#loadingScreen').classList.add('hidden');
      $('#start').style.display = 'flex';
    }, 1000);
  }
  
  // Initialize game systems
  init();
  addMobileTouchSupport();
});


