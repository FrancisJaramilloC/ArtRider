
const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/ASUS FLOW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname,old=path.join(out,'..','cotizador-mobile');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function wrap(s,w,fsz){const max=Math.floor(w/(fsz*.51)),rows=[];let line='';for(const word of s.split(/\s+/)){if((line+' '+word).trim().length>max&&line){rows.push(line);line=word;}else line=(line+' '+word).trim();}if(line)rows.push(line);return rows;}
function draw(num,kind){let a=[],i=0;const id=()=> 's'+num+'-'+(++i);
const rect=(x,y,w,h,f='#fff',st='#ccc',r=8)=>a.push('<rect id="'+id()+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+f+'" stroke="'+st+'"/>');
const text=(v,x,y,w=350,sz=14,bold=false,color='#171717')=>{const lines=wrap(v,w,sz);a.push('<text id="'+id()+'" x="'+x+'" y="'+(y+sz)+'" font-family="Inter,Arial,sans-serif" font-size="'+sz+'" font-weight="'+(bold?600:400)+'" fill="'+color+'">'+lines.map((s,j)=>'<tspan x="'+x+'" dy="'+(j?sz*1.4:0)+'">'+esc(s)+'</tspan>').join('')+'</text>');return lines.length*sz*1.4;};
const button=(label,y)=>{rect(20,y,350,48,'#222','#222');a.push('<text id="'+id()+'" x="195" y="'+(y+30)+'" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="500" fill="#fff">'+esc(label)+'</text>');};
const line=y=>a.push('<path id="'+id()+'" d="M20 '+y+'H370" stroke="#ddd"/>');
const pair=(name,value,y)=>{text(name,20,y,230,13,false,'#666');text(value,288,y,82,13,true);};
rect(0,0,390,844,'#fff','#aaa',24);text('9:41',20,17,160,12,true);text('●  ▰',326,17,44,12,true);text('‹ Atrás',20,52,350,14,true);
if(kind==='compare'){
let y=92;y+=text('Elige tu experiencia sonora',20,y,350,24,true)+10;y+=text('2 opciones para tu evento de 50 personas',20,y,350,14,false,'#666')+20;
rect(20,y,350,222);text('Esencial',36,y+14,318,16,true);text('Sonido decente, precio accesible',36,y+42,318,13,false,'#666');text('$27.50 / día',36,y+70,318,28,true);text('1× SUBWOOFER',36,y+116,318,13);text('1× Luces de Tacho LED',36,y+140,318,13);rect(36,y+174,318,34,'#fff','#aaa');text('Elegir Esencial',48,y+181,294,13,true);y+=240;
rect(20,y,350,274,'#fafafa','#222');rect(20,y,350,30,'#e6e6e6','#222');text('☆  Mejor valor',36,y+6,318,12,true);text('Recomendado',36,y+44,318,16,true);text('Mejor balance calidad-precio',36,y+72,318,13,false,'#666');text('$132.00 / día',36,y+99,318,28,true);text('2× Cajas Activas Beta 3 ES215A',36,y+145,318,13);text('4× Luces de Tacho LED',36,y+170,318,13);text('1× Sub Bajo Activo Beta 3',36,y+195,318,13);rect(36,y+230,318,32,'#222','#222');text('Elegir Recomendado',48,y+236,294,13,true,'#fff');
}else{
const recommended=kind==='recommended';let y=92;
if(recommended){rect(20,y,350,30,'#e8e8e8','none');text('☆  Mejor valor',32,y+6,326,12,true);y+=46;}
y+=text(recommended?'Recomendado':'Esencial',20,y,350,24,true)+10;
y+=text(recommended?'Mejor balance calidad-precio':'Sonido decente, precio accesible',20,y,350,14,false,'#666')+18;
y+=text(recommended?'$132.00 / día':'$27.50 / día',20,y,350,34,true)+18;
text('Incluye',20,y,350,14,true);y+=30;
for(const item of recommended?['2× Cajas Activas Beta 3 ES215A','4× Luces de Tacho LED','1× Sub Bajo Activo Beta 3']:['1× SUBWOOFER','1× Luces de Tacho LED']){y+=text('✓ '+item,20,y,350,14)+12;}
y+=10;line(y);y+=18;text('Datos de equipos y cobertura',20,y,350,13,true);y+=30;
const metadata=recommended?['Potencia: 400W · Cobertura: 80 pax','Paquete para 120 personas','Potencia: 500W · Cobertura: 150 pax']:['Cobertura estimada: hasta 70 pax','Nivel: LOW · Ambiente: nivel LOW','Tipo: Ambiental'];
for(const v of metadata){rect(20,y,350,28,'#f3f3f3','none',6);text(v,30,y+6,330,12,false,'#444');y+=36;}
y+=16;line(y);y+=18;pair('Subtotal equipos',recommended?'$120.00':'$25.00',y);y+=27;pair('Servicio ArtRider',recommended?'$12.00':'$2.50',y);y+=27;pair('Total por día',recommended?'$132.00':'$27.50',y);button('Elegir plan',748);
}
rect(145,824,100,4,'#222','none',2);return a.join('\n');}
const names={54:'planes-sugeridos',55:'equipos-recomendados',56:'plan-esencial'};
const body={54:draw(54,'compare'),55:draw(55,'recommended'),56:draw(56,'essential')};
const labels={54:'Resultado: comparar planes',55:'Plan Recomendado',56:'Plan Esencial'};
function svg(title,b,w=390,h=844){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><title>'+esc(title)+'</title>'+b+'</svg>';}
function sheet(title,sub,screens){const start=screens.length===3?478:40;let data='<rect width="2222" height="1075" fill="#f7f7f7"/><text x="40" y="62" font-family="Inter,Arial,sans-serif" font-size="32" font-weight="700">'+esc(title)+'</text><text x="40" y="98" font-family="Inter,Arial,sans-serif" font-size="16" fill="#666">'+esc(sub)+'</text>';screens.forEach((s,j)=>{const x=start+j*438;data+='<g id="pantalla-'+s.num+'"><text x="'+x+'" y="136" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="500">'+esc(s.num+' · '+s.label)+'</text><g transform="translate('+x+',154)">'+s.body+'</g></g>';});data+='<text x="40" y="1045" font-family="Inter,Arial,sans-serif" font-size="12" fill="#666">ArtRider Advisory · Wireframes móviles · Resultado adaptado de la captura · SVG vectorial</text>';return svg(title,data,2222,1075);}
async function main(){
fs.mkdirSync(out,{recursive:true});
for(const file of fs.readdirSync(old)){if((/^(46|47|48|49|50|51|52|53)-/.test(file)||file.startsWith('10-cotizador-lamina.'))&&/\.(svg|png)$/.test(file))fs.copyFileSync(path.join(old,file),path.join(out,file));}
for(const num of [54,55,56])fs.writeFileSync(path.join(out,num+'-'+names[num]+'.svg'),svg(labels[num],body[num]),'utf8');
const previous=[['51-fecha-y-ciudad.svg','Fecha y ciudad'],['52-presupuesto.svg','Presupuesto'],['53-buscando-opciones.svg','Buscando opciones']].map(([f,label])=>{const raw=fs.readFileSync(path.join(old,f),'utf8');return {num:Number(f.slice(0,2)),label,body:raw.replace(/^<svg[^>]*><title>[^<]*<\/title>/,'').replace(/<\/svg>\s*$/,'')};});
fs.writeFileSync(path.join(out,'11-cotizador-lamina.svg'),sheet('11 / Cotización y recomendaciones','Pasos 5–6 y las dos opciones reales del resultado',previous.concat([54,55].map(num=>({num,label:labels[num],body:body[num]})))));
fs.writeFileSync(path.join(out,'12-resultado-final-lamina.svg'),sheet('12 / Elige tu experiencia sonora','Resultado final · Esencial y Recomendado · Evento de 50 personas',[54,56,55].map(num=>({num,label:labels[num],body:body[num]}))));
for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.svg')&&!/^(46|47|48|49|50|51|52|53)-/.test(f)&&!f.startsWith('10-'))){await sharp(path.join(out,file),{density:file.includes('lamina')?72:144}).png().toFile(path.join(out,file.replace(/\.svg$/,'.png')));}
console.log(JSON.stringify({screens:11,sheets:3,correctTotals:{essential:'25 + 2.50 = 27.50',recommended:'120 + 12 = 132'},output:out}));
}
main().catch(e=>{console.error(e);process.exit(1)});

