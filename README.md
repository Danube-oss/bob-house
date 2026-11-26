# LA BOB HOUSE — site de colocation

## Ouvrir le site
1. Décompressez `la_bob_house.zip`.
2. Ouvrez le dossier dans Visual Studio Code.
3. Lancez `index.html` dans un navigateur (ou avec l'extension Live Server).

## Personnaliser les habitants
Dans `index.html`, cherchez `Coloc n°1`, `Coloc n°2`, `Coloc n°3` et remplacez les textes par vos prénoms, surnoms, anecdotes et citations.

## Ajouter vos photos
Déposez vos photos dans `images/`. Pour remplacer un portrait, remplacez le bloc `<div class="portrait ...">...</div>` par :
```html
<img class="portrait-photo" src="images/coloc-1.jpg" alt="Portrait du premier colocataire">
```
Ajoutez à la fin de `style.css` :
```css
.portrait-photo { width:calc(100% - 34px); height:220px; margin:17px 17px 0; object-fit:cover; border-radius:17px; }
```
Pour la galerie, utilisez par exemple :
```html
<img class="memory-photo" src="images/soiree.jpg" alt="Souvenir de la coloc">
```
Puis ajoutez :
```css
.memory-photo { display:block; width:100%; height:180px; object-fit:cover; border-radius:8px; }
```

## Jeux quotidiens
La section « Salle de jeux » comprend des mini-jeux JavaScript jouables : Yakazu simplifié 3×3, Binary/Takuzu 4×4, mini-mots fléchés et Wordle en 5 lettres. Le défi est déterminé par la date locale du navigateur. La progression n'est pas synchronisée entre appareils et il n'y a pas de classement en ligne. Pour de vrais jeux de difficulté évolutive et une progression partagée, il faudra ajouter une base de données et un backend.

## Images de Bob l'éponge
Le site actuel utilise une ambiance sous-marine originale, des bulles, des poissons, une maison ananas stylisée et des couleurs évocatrices. Il ne contient pas d'images officielles de Bob l'éponge : ajoutez uniquement des images que vous avez le droit d'utiliser (par exemple des visuels fournis/licenciés), dans le dossier `images/`, puis insérez-les avec des balises `<img>`. Évitez de récupérer des images au hasard sur Google Images pour un site public.

## Publication gratuite
Netlify : créez un compte sur https://www.netlify.com/ puis déployez le dossier décompressé par glisser-déposer. L'hébergement peut être gratuit ; un nom de domaine personnalisé est généralement payant.

## Vie privée
Le site est public. Obtenez l'accord des colocataires avant de publier leurs photos, prénoms ou anecdotes. Évitez toute adresse, numéro de téléphone ou information privée.
