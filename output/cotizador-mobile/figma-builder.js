const GROUPS=[
  {
    "title": "10 / Cotiza tu evento gratis",
    "subtitle": "Advisory móvil · Acceso y pasos 1–4",
    "screens": [
      {
        "id": 46,
        "name": "Acceso al cotizador",
        "title": "ArtRider",
        "nav": "client",
        "blocks": [
          [
            "text",
            "Encuentra equipos para tu evento",
            "heading"
          ],
          [
            "input",
            "Buscar",
            "Equipos o paquetes"
          ],
          [
            "chips",
            [
              "Sonido",
              "Iluminación",
              "Video"
            ]
          ],
          [
            "card",
            "Equipos populares en Loja",
            "Audio, iluminación y video",
            "Explorar catálogo"
          ],
          [
            "text",
            "¿No sabes qué equipos necesitas?",
            "label"
          ],
          [
            "text",
            "Cuéntanos sobre tu evento y te ayudamos a elegir.",
            "body"
          ],
          [
            "button",
            "Cotiza tu evento gratis"
          ]
        ]
      },
      {
        "id": 47,
        "name": "Tipo de evento",
        "title": "¿Qué tipo de evento tienes en mente?",
        "step": 1,
        "description": "Elige la opción que mejor describa tu celebración.",
        "choices": [
          [
            "Cumpleaños",
            false
          ],
          [
            "Boda",
            true
          ],
          [
            "Conferencia",
            false
          ],
          [
            "Festival",
            false
          ],
          [
            "Concierto",
            false
          ]
        ],
        "cta": "Siguiente"
      },
      {
        "id": 48,
        "name": "Número de asistentes",
        "title": "¿Cuántas personas asistirán?",
        "step": 2,
        "description": "Un aproximado nos ayuda a calcular el tamaño del equipo de sonido.",
        "blocks": [
          [
            "space",
            48
          ],
          [
            "range",
            "50 personas",
            "Íntimo (10)",
            "Masivo (1000+)"
          ],
          [
            "text",
            "Selecciona una cantidad aproximada.",
            "caption"
          ]
        ],
        "cta": "Siguiente"
      },
      {
        "id": 49,
        "name": "Tipo de lugar",
        "title": "¿Dónde será tu evento?",
        "step": 3,
        "description": "Esto influye en el equipo para exteriores y la acústica del lugar.",
        "choices": [
          [
            "Sala pequeña · Hasta 50 m²",
            false
          ],
          [
            "Casa · Hasta 150 m²",
            true
          ],
          [
            "Salón de eventos · Hasta 300 m²",
            false
          ],
          [
            "Quinta · 500 m²+ (exterior)",
            false
          ],
          [
            "Parque · Espacio abierto",
            false
          ],
          [
            "Estadio · Masivo",
            false
          ],
          [
            "Personalizado · Define tú mismo",
            false
          ]
        ],
        "cta": "Siguiente"
      },
      {
        "id": 50,
        "name": "Actividades del evento",
        "title": "¿Qué habrá en tu evento?",
        "step": 4,
        "description": "Selecciona todas las que apliquen.",
        "multi": true,
        "choices": [
          [
            "Discursos",
            false
          ],
          [
            "Pantalla LED",
            true
          ],
          [
            "DJ",
            false
          ],
          [
            "Show artístico",
            false
          ],
          [
            "Banda en vivo",
            false
          ]
        ],
        "cta": "Siguiente"
      }
    ]
  },
  {
    "title": "11 / Cotización y recomendaciones",
    "subtitle": "Advisory móvil · Pasos 5–6 y propuesta de equipos",
    "screens": [
      {
        "id": 51,
        "name": "Fecha y ciudad",
        "title": "¿Cuándo y dónde será tu evento?",
        "step": 5,
        "description": "Buscaremos proveedores locales con disponibilidad para esta fecha.",
        "blocks": [
          [
            "input",
            "Fecha del evento",
            "20/10/2026"
          ],
          [
            "input",
            "Ciudad (ej. Loja, Quito)",
            "Loja"
          ]
        ],
        "cta": "Siguiente"
      },
      {
        "id": 52,
        "name": "Presupuesto",
        "title": "¿Cuál es tu presupuesto aproximado?",
        "step": 6,
        "description": "Buscaremos la mejor opción que se ajuste.",
        "blocks": [
          [
            "space",
            48
          ],
          [
            "range",
            "$500",
            "$50",
            "$5000+"
          ],
          [
            "text",
            "El presupuesto nos ayuda a seleccionar los equipos.",
            "body"
          ]
        ],
        "cta": "Buscar proveedores"
      },
      {
        "id": 53,
        "name": "Buscando opciones",
        "title": "Buscando opciones",
        "blocks": [
          [
            "space",
            64
          ],
          [
            "text",
            "Tu evento está en marcha",
            "heading"
          ],
          [
            "text",
            "Estamos armando el rider técnico para tu evento de 50 personas.",
            "body"
          ],
          [
            "summary",
            [
              [
                "Evento",
                "Boda"
              ],
              [
                "Lugar",
                "Casa"
              ],
              [
                "Actividad",
                "Pantalla LED"
              ],
              [
                "Fecha",
                "20 octubre"
              ],
              [
                "Ciudad",
                "Loja"
              ],
              [
                "Presupuesto",
                "$500"
              ]
            ]
          ],
          [
            "text",
            "Te avisaremos cuando las propuestas estén listas.",
            "body"
          ]
        ]
      },
      {
        "id": 54,
        "name": "Planes sugeridos",
        "title": "Tu propuesta",
        "blocks": [
          [
            "text",
            "Boda · 50 personas · Loja",
            "label"
          ],
          [
            "text",
            "Compara las opciones para tu evento.",
            "body"
          ],
          [
            "card",
            "Económico",
            "Solución esencial",
            "$350"
          ],
          [
            "card",
            "Recomendado",
            "Opción equilibrada para tu evento",
            "$472.50"
          ],
          [
            "card",
            "Premium",
            "Mayor capacidad y cobertura",
            "$650"
          ],
          [
            "button",
            "Elegir recomendado"
          ]
        ]
      },
      {
        "id": 55,
        "name": "Equipos recomendados",
        "title": "Tu equipo recomendado",
        "blocks": [
          [
            "text",
            "Plan recomendado · Boda · 50 personas",
            "label"
          ],
          [
            "card",
            "Sistema de sonido ×2",
            "Proveedor A · Loja",
            "$150"
          ],
          [
            "card",
            "Pantalla LED ×1",
            "Proveedor B · Loja",
            "$300"
          ],
          [
            "summary",
            [
              [
                "Subtotal",
                "$450"
              ],
              [
                "Servicio (5%)",
                "$22.50"
              ],
              [
                "Total",
                "$472.50"
              ]
            ]
          ],
          [
            "text",
            "Los equipos se reunirán en una compra con varios proveedores.",
            "caption"
          ],
          [
            "button",
            "Aceptar y llevar al carrito"
          ]
        ]
      }
    ]
  }
];

await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const ids=[];const keep=n=>(ids.push(n.id),n);
const allvars=await figma.variables.getLocalVariablesAsync();const vars=Object.fromEntries(allvars.filter(v=>v.name.startsWith('color/')||v.name.startsWith('spacing/')||v.name.startsWith('radius/')).map(v=>[v.name,v]));
const styles=Object.fromEntries((await figma.getLocalTextStylesAsync()).filter(s=>s.name.startsWith('WF/')).map(s=>[s.name.slice(3),s]));
const comp={};for(const [key,id]of Object.entries({card:'4:27',row:'4:31',avatar:'4:34',photo:'4:39',client:'4:43',provider:'4:48'}))comp[key]=await figma.getNodeByIdAsync(id);
const buttonSet=await figma.importComponentSetByKeyAsync('cc8b558dc7d9684011b6b99ce8e6509399bc836b');const inputSet=await figma.importComponentSetByKeyAsync('c28150b04d333d34ed9d2b77abd9f2f54e1a878a');
comp.button=buttonSet.children.find(n=>n.name==='Variant=Primary, State=Default, Size=Medium');comp.neutral=buttonSet.children.find(n=>n.name==='Variant=Neutral, State=Default, Size=Medium');comp.input=inputSet.children.find(n=>n.name==='State=Default, Value Type=Placeholder');
const paint=n=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',vars['color/'+n]);
function txt(parent,value,style='body',width=350,color='text'){const n=keep(figma.createText());n.fontName=styles[style].fontName;n.textStyleId=styles[style].id;n.characters=String(value);n.fills=[paint(color)];parent.appendChild(n);n.textAutoResize='HEIGHT';n.resize(width,n.height);return n;}
function box(parent,name,dir='VERTICAL',width=350,gap=12,pad=0){const n=keep(figma.createAutoLayout(dir));n.name=name;n.fills=[];n.resize(width,1);n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;if(parent)parent.appendChild(n);n.layoutSizingHorizontal='FIXED';n.layoutSizingVertical='HUG';n.clipsContent=false;if([8,16,24,32].includes(gap))n.setBoundVariable('itemSpacing',vars['spacing/'+({8:'sm',16:'md',24:'lg',32:'xl'})[gap]]);return n;}
function instance(key,parent,values={}){const n=keep(comp[key].createInstance());parent.appendChild(n);const props={};for(const [key,value]of Object.entries(values)){const actual=Object.keys(n.componentProperties).find(k=>k===key||k.startsWith(key+'#'));if(actual)props[actual]=value;}if(Object.keys(props).length)n.setProperties(props);return n;}
function fixed(n,w,h){n.resize(w,h);n.layoutSizingHorizontal='FIXED';n.layoutSizingVertical='FIXED';return n;}
function button(parent,label,neutral){const n=instance(neutral?'neutral':'button',parent,{'Label':label,'Has Icon Start':false,'Has Icon End':false});n.name='Acción / '+label;fixed(n,350,48);return n;}
function field(parent,label,value){const n=instance('input',parent,{'Label':label,'Value':value,'Has Description':false,'Has Error':false,'Has Label':true});n.name='Campo / '+label;n.resize(350,n.height);n.layoutSizingHorizontal='FIXED';return n;}
function photo(parent,height=160){const n=instance('photo',parent);fixed(n,350,height);n.clipsContent=true;n.name='Fotografía / placeholder';if(n.children[0])n.children[0].resize(350,height);return n;}
function card(parent,title,meta,price){return instance('card',parent,{'Título':title,'Detalle':meta,'Precio':price});}
function row(parent,label){return instance('row',parent,{'Etiqueta':label});}
function avatar(parent,name,meta){return instance('avatar',parent,{'Nombre':name,'Correo':meta});}
function chips(parent,labels){const container=box(parent,'Filtros / opciones','HORIZONTAL',350,8);for(let k=0;k<labels.length;k++){const chip=box(container,'Opción / '+labels[k],'VERTICAL',(350-(labels.length-1)*8)/labels.length,0,8);chip.fills=[paint(k===0?'action':'subtle')];chip.cornerRadius=8;txt(chip,labels[k],'caption',chip.width-16,k===0?'onAction':'text');}return container;}
function summary(parent,rows){const sum=box(parent,'Resumen de importes','VERTICAL',350,8,16);sum.fills=[paint('subtle')];sum.cornerRadius=8;for(const [a,b]of rows){const r=box(sum,'Importe / '+a,'HORIZONTAL',318,0);txt(r,a,'body',205);const t=txt(r,b,'label',113);t.textAlignHorizontal='RIGHT';}return sum;}
function calendar(parent){const cal=box(parent,'Calendario de alquiler','VERTICAL',350,8,12);cal.fills=[paint('subtle')];txt(cal,'‹        Octubre 2026        ›','label',326);const days=['L','M','X','J','V','S','D'];for(let r=-1;r<5;r++){const line=box(cal,'Semana '+r,'HORIZONTAL',326,4);for(let c=0;c<7;c++){let value=r===-1?days[c]:String(r*7+c+1);if(+value>31)value='';const cell=box(line,'Día '+value,'VERTICAL',43,0,5);const selected=['20','21','22'].includes(value);cell.fills=selected?[paint('action')]:[];const t=txt(cell,value,'caption',33,selected?'onAction':'text');t.textAlignHorizontal='CENTER';}}return cal;}
function grid(parent,titles){const r=box(parent,'Productos / dos columnas','HORIZONTAL',350,12);for(const [idx,title]of titles.entries()){const c=box(r,title,'VERTICAL',169,6,8);c.fills=[paint('subtle')];const p=keep(figma.createRectangle());c.appendChild(p);p.resize(153,64);p.fills=[paint('placeholder')];p.cornerRadius=4;txt(c,title,'label',153);txt(c,idx===0?'$40 / día':'$60 / día','caption',153);}return r;}
function map(parent){const m=box(parent,'Mapa esquemático','VERTICAL',350,12,20);m.fills=[paint('placeholder')];for(const s of ['Loja · equipos cerca de ti','$40                    $75','            $120','Calles y ubicación aproximada']){const t=txt(m,s,'body',310);t.textAlignHorizontal='CENTER';}m.paddingTop=55;m.paddingBottom=55;return m;}
function chat(parent,value,side){const wrap=box(parent,'Mensaje / '+side,'HORIZONTAL',350,0);const bubble=box(wrap,'Burbuja','VERTICAL',290,0,12);bubble.fills=[paint(side==='right'?'placeholder':'subtle')];bubble.cornerRadius=12;txt(bubble,value,'body',266);if(side==='right')wrap.primaryAxisAlignItems='MAX';return bubble;}
function block(parent,b){const [kind,a,c,d]=b;switch(kind){case 'input':return field(parent,a,c);case 'button':return button(parent,a,c==='neutral');case 'text':return txt(parent,a,c||'body');case 'row':return row(parent,a);case 'avatar':return avatar(parent,a,c);case 'photo':return photo(parent,a);case 'card':return card(parent,a,c,d);case 'chips':return chips(parent,a);case 'summary':return summary(parent,a);case 'calendar':return calendar(parent);case 'grid':return grid(parent,a);case 'map':return map(parent);case 'chat':return chat(parent,a,c);case 'stars':return txt(parent,'☆   ☆   ☆   ☆   ☆','heading');case 'stepper':{const r=box(parent,'Selector de cantidad','HORIZONTAL',350,0,12);r.fills=[paint('subtle')];txt(r,'−','label',100);const t=txt(r,String(a),'label',126);t.textAlignHorizontal='CENTER';const plus=txt(r,'+','label',100);plus.textAlignHorizontal='RIGHT';return r;}case 'space':{const n=box(parent,'Espacio','VERTICAL',350,0);n.primaryAxisSizingMode='FIXED';n.resize(350,a);return n;}}}

const slider=await figma.getNodeByIdAsync('15:727');const progress=await figma.getNodeByIdAsync('15:726');
const screens=[],boards=[],ctaNodes=[];
function stepRange(parent,value,min,max){const n=keep(slider.createInstance());parent.appendChild(n);const props={};for(const [key,val]of [['Valor',value],['Mínimo',min],['Máximo',max]]){const k=Object.keys(n.componentProperties).find(x=>x.startsWith(key+'#'));if(k)props[k]=val;}n.setProperties(props);return n;}
function render(parent,b){if(b[0]==='range')return stepRange(parent,b[1],b[2],b[3]);return block(parent,b);}
function screen(parent,s){const col=box(parent,String(s.id)+' / '+s.name,'VERTICAL',390,12);txt(col,s.id+' · '+s.name,'label',390);
const phone=box(col,'Pantalla / '+s.name,'VERTICAL',390,12,20);phone.resize(390,844);phone.layoutSizingVertical='FIXED';phone.fills=[paint('surface')];phone.strokes=[paint('border')];phone.strokeWeight=1.5;phone.cornerRadius=24;phone.clipsContent=true;
const status=box(phone,'Estado del dispositivo','HORIZONTAL',350,0);txt(status,'9:41','caption',200);const signal=txt(status,'●  ▰','caption',150);signal.textAlignHorizontal='RIGHT';
if(s.step){const top=box(phone,'Navegación del formulario','HORIZONTAL',350,0);txt(top,'‹ Atrás','label',175);const step=txt(top,'Paso '+s.step+' de 6','caption',175,'secondary');step.textAlignHorizontal='RIGHT';const inst=keep(progress.children[s.step-1].createInstance());phone.appendChild(inst);}
txt(phone,s.title,'heading',350);
if(s.description)txt(phone,s.description,'body',350,'secondary');
const body=box(phone,'Contenido','VERTICAL',350,s.choices?8:12);
if(s.choices){for(const [label,selected]of s.choices){const icon=s.multi?(selected?'☑ ':'☐ '):(selected?'◉ ':'○ ');const n=row(body,icon+label);n.name='Opción / '+label+(selected?' / Seleccionada':'');if(selected){n.fills=[paint('subtle')];n.strokes=[paint('action')];n.strokeWeight=1.5;}}}
for(const b of s.blocks||[])render(body,b);
const spring=box(phone,'Espaciador flexible','VERTICAL',350,0);spring.resize(350,1);spring.layoutSizingVertical='FIXED';spring.layoutGrow=1;
if(s.cta){const c=button(phone,s.cta);ctaNodes.push({screen:s.id,id:c.id,label:s.cta});}
if(s.nav)instance(s.nav,phone);else{const home=keep(figma.createRectangle());phone.appendChild(home);home.resize(100,4);home.fills=[paint('text')];home.cornerRadius=2;home.layoutAlign='CENTER';}
phone.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:2}}];screens.push({id:phone.id,number:s.id,name:s.name,bodyId:body.id});return phone;}
for(const group of GROUPS){const index=+group.title.slice(0,2)-1;const board=box(page,group.title,'VERTICAL',2222,16,40);board.x=100;board.y=100+index*1140;board.fills=[paint('subtle')];board.cornerRadius=12;const heading=txt(board,group.title,'heading',2142);heading.fontSize=32;txt(board,group.subtitle,'body',2142,'secondary');const line=box(board,'Pantallas del flujo','HORIZONTAL',2142,48);for(const s of group.screens)screen(line,s);txt(board,'ArtRider Advisory · Adaptación móvil propuesta · Ejemplos ilustrativos · Capas editables','caption',2142,'secondary');board.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:1}}];boards.push({id:board.id,name:board.name,width:board.width,height:board.height});}
const over=[];for(const s of screens){const n=await figma.getNodeByIdAsync(s.id);const b=await figma.getNodeByIdAsync(s.bodyId);const fixedBottom=n.children.filter(c=>c.name==='WF / Navegación cliente'||c.type==='INSTANCE'&&c.name.startsWith('Acción')).map(c=>c.y);const limit=fixedBottom.length?Math.min(...fixedBottom):820;if(b.y+b.height>limit-8)over.push({id:s.id,number:s.number,end:b.y+b.height,limit});}
return {createdNodeIds:ids,boards,screens,ctaNodes,overflows:over};

