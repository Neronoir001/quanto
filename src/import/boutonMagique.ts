/**
 * Le « bouton magique » : un favori à ajouter dans le navigateur.
 * Sur une page de recette, il lit la fiche recette standard (schema.org/Recipe) que publie
 * le site et la copie dans le presse-papiers. Il suffit ensuite de la coller dans Quanto.
 * Rien n'est envoyé nulle part : tout se passe dans le navigateur.
 */

// Code exécuté sur la page de recette (volontairement en JavaScript simple, compatible partout).
const CODE = `(function(){
function t(d){if(Array.isArray(d)){for(var i=0;i<d.length;i++){var r=t(d[i]);if(r)return r}return null}
if(!d||typeof d!=='object')return null;var y=d['@type'];
if(y==='Recipe'||(Array.isArray(y)&&y.indexOf('Recipe')>=0))return d;
if(d['@graph'])return t(d['@graph']);if(d.mainEntity)return t(d.mainEntity);return null}
var r=null,s=document.querySelectorAll('script[type="application/ld+json"]');
for(var i=0;i<s.length&&!r;i++){try{r=t(JSON.parse(s[i].textContent))}catch(e){}}
var o={quanto:'bouton-magique',url:location.href,titre:document.title};
if(r){var g={},k=['name','recipeYield','yield','prepTime','cookTime','performTime','recipeCategory','recipeCuisine','keywords','image','recipeIngredient','ingredients','recipeInstructions','description','url','@type'];
for(var j=0;j<k.length;j++){if(r[k[j]]!==undefined)g[k[j]]=r[k[j]]}o.recette=g}
else{var c=String(window.getSelection()||'')||(document.querySelector('article,main')||document.body).innerText;o.texte=c.slice(0,20000)}
var x=JSON.stringify(o);
function ok(){alert(r?'Recette copiée ! Ouvrez Quanto, puis Importer › Coller.':'Pas de fiche recette sur cette page : son texte a été copié. Ouvrez Quanto, puis Importer › Coller.')}
function z(){var a=document.createElement('textarea');a.value=x;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();
try{document.execCommand('copy')?ok():prompt('Copiez ce texte, puis collez-le dans Quanto :',x)}catch(e){prompt('Copiez ce texte, puis collez-le dans Quanto :',x)}a.remove()}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(x).then(ok,z)}else{z()}})();`

/** Adresse du favori (« javascript:… »), à glisser dans la barre de favoris ou à coller dans un favori. */
export const BOUTON_MAGIQUE = `javascript:${encodeURIComponent(CODE.replace(/\n/g, ''))}`
