// LYRA in-device JA <-> EN model runner (browser-only, experimental).
// No chat text is uploaded to DeepL, OpenAI, or any server.
// Initial JS and model weights ARE downloaded from CDN/Hugging Face when requested.
// Model IDs are community-converted ONNX candidates; availability must be tested on device.
const ID_PAIRS={
 'JA-EN':['Xenova/opus-mt-ja-en','Xenova/opus-mt-jap-en'],
 'EN-JA':['Xenova/opus-mt-en-jap','Xenova/opus-mt-en-ja'],
};
let pipelines=new Map();
let converter=null;
let queue=Promise.resolve();
async function getPipeline(id,source,target){
 const key=source+'-'+target;
 if(pipelines.has(key))return pipelines.get(key);
 const names=ID_PAIRS[key];
 if(!names)throw Error('日英以外には対応していません');
 if(!converter){
  self.postMessage({type:'progress',message:'翻訳処理プログラムをダウンロード中…'});
  const mod=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
  mod.env.allowLocalModels=false;
  mod.env.useBrowserCache=true;
  if(mod.env.backends?.onnx?.wasm)mod.env.backends.onnx.wasm.numThreads=1;
  converter=mod.pipeline;
 }
 let lastError;
 for(const name of names){
  try{
   self.postMessage({type:'progress',message:'翻訳モデルをダウンロード中…（Wi-Fi推奨）'});
   const pipe=await converter('translation',name,{
    quantized:true,
    progress_callback:(p)=>{
      if(p?.status==='progress'&&typeof p.progress==='number')self.postMessage({type:'progress',message:'翻訳モデルの準備 '+Math.min(100,Math.round(p.progress))+'%'});
    }
   });
   pipelines.set(key,pipe);return pipe;
  }catch(e){lastError=e;}
 }
 throw Error('対応する日英モデルを読み込めませんでした：'+(lastError?.message||'モデルが見つかりません'));
}
async function run(req){
 const {id,action,source,target,text}=req;
 try{
  const engine=await getPipeline(id,source,target);
  if(action==='prepare'){self.postMessage({type:'result',id,ready:true});return;}
  if(action!=='translate'||!text||text.length>2000)throw Error('翻訳できる文章は2000文字以内です');
  const output=await engine(text,{max_new_tokens:256});
  let translated=Array.isArray(output)?output[0]?.translation_text:output?.translation_text;
  if(typeof translated!=='string'||!translated.trim())throw Error('モデルが訳文を返しませんでした');
  self.postMessage({type:'result',id,text:translated.trim()});
 }catch(e){self.postMessage({type:'error',id,error:String(e?.message||e)})}
}
self.onmessage=(event)=>{const req=event.data;queue=queue.then(()=>run(req)).catch(e=>self.postMessage({type:'error',id:req?.id,error:String(e)}));};
