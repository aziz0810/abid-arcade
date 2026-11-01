/* Matchday Arcade · translations (English, Français, العربية)
   The page is written in English. This file translates what is on screen as it appears:
   exact phrases from the dictionaries below, and patterns for sentences that contain names or numbers.
   Player names, clubs and chat messages are never translated. */
(function(){
"use strict";
const LANGS={en:"English",fr:"Français",ar:"العربية"};
let lang=(()=>{ try{ const s=localStorage.getItem("arc-lang"); if(s&&LANGS[s]) return s; }catch(e){}
  const n=(navigator.language||"en").slice(0,2); return LANGS[n]?n:"en"; })();

/* ---------- countries ---------- */
const C={fr:{},ar:{}};
[["Albania","Albanie","ألبانيا"],["Algeria","Algérie","الجزائر"],["Andorra","Andorre","أندورا"],["Angola","Angola","أنغولا"],["Argentina","Argentine","الأرجنتين"],["Armenia","Arménie","أرمينيا"],["Australia","Australie","أستراليا"],["Austria","Autriche","النمسا"],["Azerbaijan","Azerbaïdjan","أذربيجان"],["Bahrain","Bahreïn","البحرين"],["Bangladesh","Bangladesh","بنغلاديش"],["Belarus","Biélorussie","بيلاروسيا"],["Belgium","Belgique","بلجيكا"],["Belize","Belize","بليز"],["Benin","Bénin","بنين"],["Bermuda","Bermudes","برمودا"],["Bolivia","Bolivie","بوليفيا"],["Bosnia-Herzegovina","Bosnie-Herzégovine","البوسنة والهرسك"],["Brazil","Brésil","البرازيل"],["Bulgaria","Bulgarie","بلغاريا"],["Burkina Faso","Burkina Faso","بوركينا فاسو"],["Burundi","Burundi","بوروندي"],["Cambodia","Cambodge","كمبوديا"],["Cameroon","Cameroun","الكاميرون"],["Canada","Canada","كندا"],["Cape Verde","Cap-Vert","الرأس الأخضر"],["Central African Republic","Centrafrique","أفريقيا الوسطى"],["Chad","Tchad","تشاد"],["Chile","Chili","تشيلي"],["China","Chine","الصين"],["Chinese Taipei","Taipei chinois","تايبيه الصينية"],["Colombia","Colombie","كولومبيا"],["Comoros","Comores","جزر القمر"],["Congo","Congo","الكونغو"],["Costa Rica","Costa Rica","كوستاريكا"],["Croatia","Croatie","كرواتيا"],["Cuba","Cuba","كوبا"],["Curacao","Curaçao","كوراساو"],["Cyprus","Chypre","قبرص"],["Czech Republic","Tchéquie","التشيك"],["Denmark","Danemark","الدنمارك"],["Dominican Republic","Rép. dominicaine","الدومينيكان"],["DR Congo","RD Congo","الكونغو الديمقراطية"],["Ecuador","Équateur","الإكوادور"],["Egypt","Égypte","مصر"],["El Salvador","Salvador","السلفادور"],["England","Angleterre","إنجلترا"],["Equatorial Guinea","Guinée équatoriale","غينيا الاستوائية"],["Estonia","Estonie","إستونيا"],["Ethiopia","Éthiopie","إثيوبيا"],["Faroe Islands","Îles Féroé","جزر فارو"],["Fiji","Fidji","فيجي"],["Finland","Finlande","فنلندا"],["France","France","فرنسا"],["Gabon","Gabon","الغابون"],["Georgia","Géorgie","جورجيا"],["Germany","Allemagne","ألمانيا"],["Ghana","Ghana","غانا"],["Gibraltar","Gibraltar","جبل طارق"],["Greece","Grèce","اليونان"],["Guadeloupe","Guadeloupe","غوادلوب"],["Guatemala","Guatemala","غواتيمالا"],["Guinea","Guinée","غينيا"],["Guinea-Bissau","Guinée-Bissau","غينيا بيساو"],["Haiti","Haïti","هايتي"],["Honduras","Honduras","هندوراس"],["Hong Kong","Hong Kong","هونغ كونغ"],["Hungary","Hongrie","المجر"],["Iceland","Islande","آيسلندا"],["India","Inde","الهند"],["Indonesia","Indonésie","إندونيسيا"],["Iran","Iran","إيران"],["Iraq","Irak","العراق"],["Ireland","Irlande","أيرلندا"],["Israel","Israël","إسرائيل"],["Italy","Italie","إيطاليا"],["Ivory Coast","Côte d'Ivoire","ساحل العاج"],["Jamaica","Jamaïque","جامايكا"],["Japan","Japon","اليابان"],["Jordan","Jordanie","الأردن"],["Kazakhstan","Kazakhstan","كازاخستان"],["Kenya","Kenya","كينيا"],["Kosovo","Kosovo","كوسوفو"],["Kuwait","Koweït","الكويت"],["Kyrgyzstan","Kirghizistan","قيرغيزستان"],["Latvia","Lettonie","لاتفيا"],["Lebanon","Liban","لبنان"],["Liberia","Libéria","ليبيريا"],["Libya","Libye","ليبيا"],["Liechtenstein","Liechtenstein","ليختنشتاين"],["Lithuania","Lituanie","ليتوانيا"],["Luxembourg","Luxembourg","لوكسمبورغ"],["Madagascar","Madagascar","مدغشقر"],["Malaysia","Malaisie","ماليزيا"],["Maldives","Maldives","المالديف"],["Mali","Mali","مالي"],["Malta","Malte","مالطا"],["Martinique","Martinique","مارتينيك"],["Mauritania","Mauritanie","موريتانيا"],["Mexico","Mexique","المكسيك"],["Moldova","Moldavie","مولدوفا"],["Montenegro","Monténégro","الجبل الأسود"],["Morocco","Maroc","المغرب"],["Mozambique","Mozambique","موزمبيق"],["Myanmar","Birmanie","ميانمار"],["Netherlands","Pays-Bas","هولندا"],["New Caledonia","Nouvelle-Calédonie","كاليدونيا الجديدة"],["New Zealand","Nouvelle-Zélande","نيوزيلندا"],["Nicaragua","Nicaragua","نيكاراغوا"],["Niger","Niger","النيجر"],["Nigeria","Nigeria","نيجيريا"],["North Korea","Corée du Nord","كوريا الشمالية"],["North Macedonia","Macédoine du Nord","مقدونيا الشمالية"],["Northern Ireland","Irlande du Nord","أيرلندا الشمالية"],["Norway","Norvège","النرويج"],["Oman","Oman","عُمان"],["Palestine","Palestine","فلسطين"],["Panama","Panama","بنما"],["Paraguay","Paraguay","باراغواي"],["Peru","Pérou","بيرو"],["Philippines","Philippines","الفلبين"],["Poland","Pologne","بولندا"],["Portugal","Portugal","البرتغال"],["Puerto Rico","Porto Rico","بورتوريكو"],["Qatar","Qatar","قطر"],["Romania","Roumanie","رومانيا"],["Russia","Russie","روسيا"],["Rwanda","Rwanda","رواندا"],["San Marino","Saint-Marin","سان مارينو"],["Saudi Arabia","Arabie saoudite","السعودية"],["Scotland","Écosse","اسكتلندا"],["Senegal","Sénégal","السنغال"],["Serbia","Serbie","صربيا"],["Sierra Leone","Sierra Leone","سيراليون"],["Singapore","Singapour","سنغافورة"],["Slovakia","Slovaquie","سلوفاكيا"],["Slovenia","Slovénie","سلوفينيا"],["South Africa","Afrique du Sud","جنوب أفريقيا"],["South Korea","Corée du Sud","كوريا الجنوبية"],["Spain","Espagne","إسبانيا"],["Sri Lanka","Sri Lanka","سريلانكا"],["Sudan","Soudan","السودان"],["Suriname","Suriname","سورينام"],["Sweden","Suède","السويد"],["Switzerland","Suisse","سويسرا"],["Syria","Syrie","سوريا"],["Tahiti","Tahiti","تاهيتي"],["Tajikistan","Tadjikistan","طاجيكستان"],["Tanzania","Tanzanie","تنزانيا"],["Thailand","Thaïlande","تايلاند"],["The Gambia","Gambie","غامبيا"],["Togo","Togo","توغو"],["Trinidad and Tobago","Trinité-et-Tobago","ترينيداد وتوباغو"],["Tunisia","Tunisie","تونس"],["Türkiye","Turquie","تركيا"],["Uganda","Ouganda","أوغندا"],["Ukraine","Ukraine","أوكرانيا"],["United Arab Emirates","Émirats arabes unis","الإمارات"],["United States","États-Unis","الولايات المتحدة"],["Uruguay","Uruguay","الأوروغواي"],["Uzbekistan","Ouzbékistan","أوزبكستان"],["Venezuela","Venezuela","فنزويلا"],["Vietnam","Viêt Nam","فيتنام"],["Wales","Pays de Galles","ويلز"],["Zambia","Zambie","زامبيا"],["Zimbabwe","Zimbabwe","زيمبابوي"]
].forEach(([en,fr,ar])=>{ C.fr[en]=fr; C.ar[en]=ar; });

/* ---------- words used inside sentences ---------- */
const W={
 fr:{"Europe":"Europe","South America":"Amérique du Sud","Africa":"Afrique","Asia":"Asie","North or Central America":"Amérique du Nord ou centrale","Oceania":"Océanie","world football":"le football mondial",
   "goalkeeper":"gardien","centre-back":"défenseur central","full-back":"latéral","defensive midfielder":"milieu défensif","central midfielder":"milieu central","attacking midfielder":"milieu offensif","winger":"ailier","striker":"attaquant","footballer":"footballeur",
   "Goalkeeper":"Gardien","Defender":"Défenseur","Midfielder":"Milieu","Forward":"Attaquant","Goalkeepers":"Gardiens","Defenders":"Défenseurs","Forwards":"Attaquants",
   "Centre-back":"Défenseur central","Full-back":"Latéral","Defensive mid":"Milieu défensif","Central mid":"Milieu central","Attacking mid":"Milieu offensif","Winger":"Ailier","Striker":"Attaquant",
   "Guess the Player":"Devine le joueur","30 Seconds":"30 secondes","Letter Rush":"Course aux lettres","Name Chain":"Chaîne de noms","Link Up":"Link Up","Who Am I?":"Qui suis-je ?","Career Path":"Parcours","World Cup Run":"Coupe du monde",
   "Group stage · match 1":"Phase de groupes · match 1","Group stage · match 2":"Phase de groupes · match 2","Group stage · match 3":"Phase de groupes · match 3","Round of 16":"Huitièmes de finale","Quarter-final":"Quart de finale","Semi-final":"Demi-finale","Final":"Finale",
   "Group stage":"Phase de groupes","Quarter-finals":"Quarts de finale","Semi-finals":"Demi-finales","Champion":"Champion",
   "Club":"Club","Nation":"Nation","League":"Ligue","Legend":"Légende","Coach":"Entraîneur","Award":"Trophée","Trophy":"Trophée","Action":"Action","Wild":"Joker","Skip":"Passe","Ballon d'Or":"Ballon d'Or","Champions League":"Ligue des champions",
   "Bronze":"Bronze","Silver":"Argent","Gold":"Or","Platinum":"Platine"},
 ar:{"Europe":"أوروبا","South America":"أمريكا الجنوبية","Africa":"أفريقيا","Asia":"آسيا","North or Central America":"أمريكا الشمالية أو الوسطى","Oceania":"أوقيانوسيا","world football":"كرة القدم العالمية",
   "goalkeeper":"حارس مرمى","centre-back":"قلب دفاع","full-back":"ظهير","defensive midfielder":"لاعب وسط دفاعي","central midfielder":"لاعب وسط","attacking midfielder":"صانع ألعاب","winger":"جناح","striker":"مهاجم","footballer":"لاعب كرة قدم",
   "Goalkeeper":"حارس مرمى","Defender":"مدافع","Midfielder":"لاعب وسط","Forward":"مهاجم","Goalkeepers":"حراس المرمى","Defenders":"المدافعون","Forwards":"المهاجمون",
   "Centre-back":"قلب دفاع","Full-back":"ظهير","Defensive mid":"وسط دفاعي","Central mid":"وسط","Attacking mid":"وسط هجومي","Winger":"جناح","Striker":"مهاجم",
   "Guess the Player":"خمّن اللاعب","30 Seconds":"30 ثانية","Letter Rush":"سباق الحروف","Name Chain":"سلسلة الأسماء","Link Up":"الربط","Who Am I?":"من أنا؟","Career Path":"المسيرة","World Cup Run":"مشوار كأس العالم",
   "Group stage · match 1":"دور المجموعات · المباراة 1","Group stage · match 2":"دور المجموعات · المباراة 2","Group stage · match 3":"دور المجموعات · المباراة 3","Round of 16":"دور الـ16","Quarter-final":"ربع النهائي","Semi-final":"نصف النهائي","Final":"النهائي",
   "Group stage":"دور المجموعات","Quarter-finals":"ربع النهائي","Semi-finals":"نصف النهائي","Champion":"البطل",
   "Club":"نادي","Nation":"منتخب","League":"دوري","Legend":"أسطورة","Coach":"مدرب","Award":"جائزة","Trophy":"لقب","Action":"حركة","Wild":"جوكر","Skip":"تخطٍّ","Ballon d'Or":"الكرة الذهبية","Champions League":"دوري الأبطال",
   "Bronze":"برونزي","Silver":"فضي","Gold":"ذهبي","Platinum":"بلاتيني"}
};

/* ---------- exact phrases ---------- */
const D={fr:{},ar:{}};
const add=(en,fr,ar)=>{ D.fr[en]=fr; D.ar[en]=ar; };
[
// header & hub
["Matchday","Matchday","ماتش داي"],["Arcade","Arcade","أركيد"],["Football games · play online or on one device ·","Jeux de foot · en ligne ou sur un seul appareil ·","ألعاب كرة القدم · أونلاين أو على جهاز واحد ·"],["players","joueurs","لاعب"],
["👥 Friends","👥 Amis","👥 الأصدقاء"],["⚙ Settings","⚙ Réglages","⚙ الإعدادات"],["Settings","Réglages","الإعدادات"],["Play online","Jouer en ligne","العب أونلاين"],
["Create a room, share the code, play from different phones and computers. Chat, reactions, all five games.","Crée un salon, partage le code et joue depuis plusieurs téléphones et ordinateurs. Chat, réactions et tous les jeux.","أنشئ غرفة، شارك الرمز والعب من هواتف وحواسيب مختلفة. دردشة وتفاعلات وكل الألعاب."],
["Who Am I?","Qui suis-je ?","من أنا؟"],["Clues appear one by one. Name the mystery footballer early for more points.","Les indices apparaissent un par un. Trouve le joueur mystère tôt pour plus de points.","تظهر التلميحات واحداً تلو الآخر. اعرف اللاعب الغامض مبكراً لتربح نقاطاً أكثر."],
["Career Path","Parcours","المسيرة"],["A career appears club by club. Name the player before the last club shows.","Une carrière apparaît club par club. Trouve le joueur avant le dernier club.","تظهر المسيرة نادياً تلو الآخر. اعرف اللاعب قبل ظهور آخر نادٍ."],
["World Cup Run","Coupe du monde","مشوار كأس العالم"],["Take your country to the final: score by naming the opponents' players before the whistle.","Mène ton pays en finale : marque en citant les joueurs adverses avant le coup de sifflet.","قُد منتخبك إلى النهائي: سجّل بذكر لاعبي الخصم قبل صافرة النهاية."],
["Challenges","Défis","التحديات"],["Three new daily challenges and three weekly ones. Earn XP and build a streak.","Trois nouveaux défis par jour et trois par semaine. Gagne de l'XP et enchaîne les séries.","ثلاثة تحديات يومية وثلاثة أسبوعية. اربح نقاط الخبرة وحافظ على السلسلة."],
["Leaderboards","Classements","الترتيب"],["This month's top online players and today's fastest Guess the Player solvers.","Les meilleurs joueurs en ligne du mois et les plus rapides du défi du jour.","أفضل لاعبي الشهر أونلاين وأسرع من حلّ تحدي اليوم."],
["Guess the Player Duel","Duel Devine le joueur","مواجهة خمّن اللاعب"],["2–4 players on one device take turns hunting the same secret player.","2 à 4 joueurs sur un appareil cherchent à tour de rôle le même joueur secret.","من 2 إلى 4 لاعبين على جهاز واحد يتناوبون على البحث عن نفس اللاعب السري."],
["Guess the Player","Devine le joueur","خمّن اللاعب"],["Find the secret footballer. Every guess is ranked by how close it is. Daily match and unlimited.","Trouve le footballeur secret. Chaque essai est classé selon sa proximité. Match du jour et mode illimité.","اعثر على اللاعب السري. كل محاولة تُرتَّب حسب قربها منه. مباراة اليوم ووضع غير محدود."],
["30 Seconds","30 secondes","30 ثانية"],["One category, thirty seconds. Name as many players as you can. Up to 4 players.","Une catégorie, trente secondes. Cite un maximum de joueurs. Jusqu'à 4 joueurs.","فئة واحدة وثلاثون ثانية. اذكر أكبر عدد من اللاعبين. حتى 4 لاعبين."],
["Letter Rush","Course aux lettres","سباق الحروف"],["Name players whose first name or surname starts with the letter. Beat the clock.","Cite des joueurs dont le prénom ou le nom commence par la lettre. Bats le chrono.","اذكر لاعبين يبدأ اسمهم أو لقبهم بالحرف. سابق الوقت."],
["Name Chain","Chaîne de noms","سلسلة الأسماء"],["Ronaldo ends in O, so Onana is next. Keep the chain alive against the CPU or friends.","Ronaldo finit par O, donc Onana suit. Fais durer la chaîne contre l'ordinateur ou tes amis.","رونالدو ينتهي بحرف O، إذن أونانا هو التالي. حافظ على السلسلة ضد الكمبيوتر أو أصدقائك."],
["Link Up","Link Up","الربط"],["A card game. Play Real Madrid on Man United by naming a player who played for both.","Un jeu de cartes. Pose Real Madrid sur Man United en citant un joueur passé par les deux.","لعبة ورق. ضع ريال مدريد على مان يونايتد بذكر لاعب لعب للفريقين."],
["← All games","← Tous les jeux","← كل الألعاب"],["How to play","Règles","طريقة اللعب"],["Stats","Stats","الإحصائيات"],["Rules","Règles","القواعد"],["Close","Fermer","إغلاق"],
// guess the player (solo)
["Find the secret footballer ·","Trouve le footballeur secret ·","اعثر على اللاعب السري ·"],["players ranked by similarity","joueurs classés par ressemblance","لاعب مرتّبون حسب التشابه"],
["Daily match","Match du jour","مباراة اليوم"],["Unlimited","Illimité","غير محدود"],["Closer player","Joueur plus proche","لاعب أقرب"],["Position","Poste","المركز"],["Decade","Décennie","العقد"],["Region","Région","المنطقة"],["A club","Un club","نادٍ"],
["Give up","Abandonner","استسلام"],["Reveal the answer and end this round?","Révéler la réponse et finir la partie ?","كشف الإجابة وإنهاء الجولة؟"],["Reveal","Révéler","اكشف"],["Keep playing","Continuer","تابع اللعب"],
["Your guesses","Tes essais","محاولاتك"],["Your guesses, closest first","Tes essais, du plus proche au plus loin","محاولاتك، الأقرب أولاً"],["Loading players…","Chargement des joueurs…","جارٍ تحميل اللاعبين…"],["Top 10","Top 10","أفضل 10"],
["Type a player's name…","Tape le nom d'un joueur…","اكتب اسم لاعب…"],["Guess a player","Propose un joueur","خمّن لاعباً"],["Show clue chips on guesses","Afficher les indices sur les essais","إظهار التلميحات على المحاولات"],["Your stats","Tes stats","إحصائياتك"],["Stats are saved in this browser only.","Les stats sont enregistrées dans ce navigateur uniquement.","تُحفظ الإحصائيات في هذا المتصفح فقط."],
["Nation","Nation","المنتخب"],["Club","Club","النادي"],["League","Ligue","الدوري"],["Age","Âge","العمر"],["Teammate","Coéquipier","زميل"],["Latest","Dernier","الأحدث"],
["Rivaldo · Brazil, Barcelona, Milan","Rivaldo · Brésil, Barcelone, Milan","ريفالدو · البرازيل، برشلونة، ميلان"],["Jordan Pickford · nothing in common","Jordan Pickford · aucun point commun","جوردان بيكفورد · لا شيء مشترك"],
["Copy result","Copier le résultat","نسخ النتيجة"],["Play unlimited","Jouer en illimité","العب بلا حدود"],["New player","Nouveau joueur","لاعب جديد"],["Guesses","Essais","المحاولات"],["Hints","Indices","التلميحات"],["Best before answer","Meilleur avant la réponse","الأفضل قبل الإجابة"],["Answer revealed","Réponse révélée","تم كشف الإجابة"],
["Played","Joués","لُعبت"],["Solved","Résolus","تم حلّها"],["Streak","Série","السلسلة"],["Avg guesses","Moy. essais","متوسط المحاولات"],["Avg hints","Moy. indices","متوسط التلميحات"],["Any era","Toutes époques","كل الحقب"],["Stars","Stars","النجوم"],["Well known","Connus","معروفون"],["Deep cuts","Pour experts","للخبراء"],
// timed games & local
["Enter","Valider","أدخل"],["Players (pass the phone)","Joueurs (passez-vous le téléphone)","اللاعبون (مرّروا الهاتف)"],["Solo","Solo","فردي"],["Rounds","Manches","الجولات"],["Seconds per turn","Secondes par tour","ثوانٍ لكل دور"],["Start","Commencer","ابدأ"],
["You get a category. Name as many players who fit it as you can before the clock runs out. Surnames alone are fine: type “Salah” and press Enter.","Tu reçois une catégorie. Cite un maximum de joueurs qui y correspondent avant la fin du chrono. Le nom seul suffit : tape « Salah » puis Entrée.","تحصل على فئة. اذكر أكبر عدد من اللاعبين المطابقين قبل انتهاء الوقت. يكفي اللقب: اكتب «Salah» واضغط إدخال."],
["Name as many players as you can whose first name or surname starts with the letter. Surnames alone are fine: type “Salah” and press Enter.","Cite un maximum de joueurs dont le prénom ou le nom commence par la lettre. Le nom seul suffit : tape « Salah » puis Entrée.","اذكر أكبر عدد من اللاعبين يبدأ اسمهم أو لقبهم بالحرف. يكفي اللقب: اكتب «Salah» واضغط إدخال."],
["Letter (? = a random letter each round)","Lettre (? = une lettre au hasard à chaque manche)","الحرف (؟ = حرف عشوائي في كل جولة)"],["Type a name, press Enter","Tape un nom, puis Entrée","اكتب اسماً واضغط إدخال"],["Player name","Nom du joueur","اسم اللاعب"],["Name a player…","Cite un joueur…","اذكر لاعباً…"],
["Mode","Mode","الوضع"],["You vs CPU","Toi contre l'ordinateur","أنت ضد الكمبيوتر"],["Pass & play","Chacun son tour","العب بالتناوب"],["Solo streak","Série en solo","سلسلة فردية"],["CPU strength","Niveau de l'ordinateur","مستوى الكمبيوتر"],["Easy","Facile","سهل"],["Normal","Normal","عادي"],["Hard","Difficile","صعب"],["Seconds per answer","Secondes par réponse","ثوانٍ لكل إجابة"],["Kick off","Coup d'envoi","انطلاق"],
["CPU opponents","Adversaires ordinateur","خصوم الكمبيوتر"],["Cards each","Cartes chacun","بطاقات لكل لاعب"],["Turn timer","Chrono par tour","مؤقت الدور"],["Off","Désactivé","إيقاف"],["Deal","Distribuer","وزّع"],["I'm ready","Je suis prêt","أنا جاهز"],
["Get rid of all your cards. To play a card,","Débarrasse-toi de toutes tes cartes. Pour poser une carte,","تخلّص من كل بطاقاتك. لتلعب بطاقة،"],["name a player who links it to the card on the table","cite un joueur qui la relie à la carte posée","اذكر لاعباً يربطها بالبطاقة على الطاولة"],
["Deck","Pioche","الكومة"],["Draw","Piocher","اسحب"],["Play","Jouer","العب"],["Cancel","Annuler","إلغاء"],["Your hand","Ta main","يدك"],["Match log","Journal du match","سجل المباراة"],["Draw a card","Piocher une carte","اسحب بطاقة"],["Name the linking player…","Le joueur qui relie…","اللاعب الرابط…"],["Linking player","Joueur de liaison","اللاعب الرابط"],
["Full time","Fin du match","نهاية المباراة"],["Play again","Rejouer","العب مجدداً"],["All games","Tous les jeux","كل الألعاب"],["Next turn","Tour suivant","الدور التالي"],["New game","Nouvelle partie","لعبة جديدة"],["See final scores","Voir les scores finaux","النتائج النهائية"],["Big names you missed","Grands noms oubliés","أسماء كبيرة فاتتك"],["Big names nobody said","Grands noms que personne n'a cités","أسماء كبيرة لم يذكرها أحد"],
["Change settings","Changer les réglages","تغيير الإعدادات"],["Change players","Changer de joueurs","تغيير اللاعبين"],["Change game","Changer de jeu","تغيير اللعبة"],["Next round","Manche suivante","الجولة التالية"],["Final results","Résultats finaux","النتائج النهائية"],["Total","Total","المجموع"],["Live","En direct","مباشر"],
["Players","Joueurs","اللاعبون"],["Secret player from","Joueur secret parmi","اللاعب السري من"],["Start duel","Lancer le duel","ابدأ المواجهة"],["Mystery player from","Joueur mystère parmi","اللاعب الغامض من"],["Theme","Thème","الموضوع"],
["Next clue (−1)","Indice suivant (−1)","التلميح التالي (−1)"],["Next club (−1)","Club suivant (−1)","النادي التالي (−1)"],["Who is it?","Qui est-ce ?","من هو؟"],["Next player","Joueur suivant","اللاعب التالي"],["See your score","Voir ton score","شاهد نتيجتك"],
["Your team","Ton équipe","منتخبك"],["Match length","Durée du match","مدة المباراة"],["Shoot","Tirer","سدّد"],["Group stage: 2 losses and you're out · knockouts: one loss","Phase de groupes : 2 défaites et c'est fini · élimination directe ensuite","دور المجموعات: هزيمتان وتخرج · الأدوار الإقصائية: هزيمة واحدة"],
["Your run","Ton parcours","مشوارك"],["Change team","Changer d'équipe","تغيير المنتخب"],["✅ You win!","✅ Victoire !","✅ فزت!"],["❌ Defeat.","❌ Défaite.","❌ خسارة."],["No goals this match","Aucun but ce match","لا أهداف في هذه المباراة"],
// themes
["All football","Tout le foot","كل كرة القدم"],["Arab footballers","Joueurs arabes","اللاعبون العرب"],["African players","Joueurs africains","اللاعبون الأفارقة"],["South Americans","Sud-Américains","لاعبو أمريكا الجنوبية"],["Legends (born before 1985)","Légendes (nés avant 1985)","الأساطير (مواليد قبل 1985)"],["New generation (born 2000+)","Nouvelle génération (nés en 2000+)","الجيل الجديد (مواليد 2000+)"],
// online: sign in & home
["Demo: this device only","Démo : cet appareil uniquement","تجريبي: هذا الجهاز فقط"],["Online","En ligne","متصل"],["Sound on","Son activé","الصوت مفعّل"],["Sound off","Son coupé","الصوت مكتوم"],["Sound on or off","Activer ou couper le son","تشغيل أو كتم الصوت"],
["Create a room, send the code to your friends, and play together from any phone or computer. Chat and reactions included.","Crée un salon, envoie le code à tes amis et jouez ensemble depuis n'importe quel téléphone ou ordinateur. Chat et réactions inclus.","أنشئ غرفة، أرسل الرمز لأصدقائك والعبوا معاً من أي هاتف أو حاسوب. مع الدردشة والتفاعلات."],
["Your name","Ton pseudo","اسمك"],["Pick an avatar","Choisis un avatar","اختر صورة رمزية"],["Play as guest","Jouer en invité","العب كضيف"],["Sign in with Google","Se connecter avec Google","تسجيل الدخول بحساب Google"],["Guests just need a name. Google sign-in keeps the same player on every device.","Un invité n'a besoin que d'un pseudo. La connexion Google garde ton profil sur tous tes appareils.","يكفي الضيف اسم فقط. تسجيل الدخول بـGoogle يحفظ حسابك على كل أجهزتك."],
["Playing as a guest","Connecté en invité","تلعب كضيف"],["Signed in with Google","Connecté avec Google","مسجّل بحساب Google"],["Edit","Modifier","تعديل"],["Sign out","Se déconnecter","تسجيل الخروج"],["Save","Enregistrer","حفظ"],
["🏆 Leaderboards","🏆 Classements","🏆 الترتيب"],["👤 Profile","👤 Profil","👤 الملف الشخصي"],["🎯 Challenges","🎯 Défis","🎯 التحديات"],["Create a room","Créer un salon","إنشاء غرفة"],["Pick the first game. You can switch games in the room.","Choisis le premier jeu. Tu pourras changer dans le salon.","اختر أول لعبة. يمكنك تغييرها داخل الغرفة."],
["Race: unlimited guesses, first to find the secret player wins. Team: take turns on one shared list.","Course : essais illimités, le premier qui trouve gagne. Équipe : chacun son tour sur une liste commune.","سباق: محاولات غير محدودة، أول من يجد اللاعب السري يفوز. فريق: بالتناوب على قائمة مشتركة."],
["Same category on every phone. Answers nobody else gave score double.","Même catégorie sur chaque téléphone. Les réponses que personne d'autre n'a données valent double.","نفس الفئة على كل هاتف. الإجابات التي لم يذكرها غيرك نقاطها مضاعفة."],
["One letter, everyone at once. Unique answers score double.","Une lettre, tout le monde en même temps. Les réponses uniques valent double.","حرف واحد والجميع في نفس الوقت. الإجابات الفريدة نقاطها مضاعفة."],
["Take turns. Each name starts with the last letter of the one before.","Chacun son tour. Chaque nom commence par la dernière lettre du précédent.","بالتناوب. كل اسم يبدأ بآخر حرف من الاسم السابق."],
["A career appears club by club, oldest first. Name the player early for more points.","Une carrière apparaît club par club, du plus ancien au plus récent. Trouve vite pour plus de points.","تظهر المسيرة نادياً تلو الآخر من الأقدم. اعرف اللاعب مبكراً لنقاط أكثر."],
["Seven matches from the group stage to the final. Name players of the opposing nation to score goals.","Sept matchs, de la phase de groupes à la finale. Cite les joueurs de la nation adverse pour marquer.","سبع مباريات من دور المجموعات حتى النهائي. اذكر لاعبي المنتخب المنافس لتسجّل الأهداف."],
["Clues appear one by one for everyone. Name the mystery player early for more points.","Les indices apparaissent un par un pour tous. Trouve tôt pour plus de points.","تظهر التلميحات للجميع واحداً تلو الآخر. اعرف اللاعب مبكراً لنقاط أكثر."],
["The football card game. Private hands, CPUs can fill seats.","Le jeu de cartes du foot. Mains privées, l'ordinateur peut compléter.","لعبة الورق الكروية. أوراق خاصة، والكمبيوتر يكمل المقاعد."],
["Who can join","Qui peut rejoindre","من يمكنه الانضمام"],["🔒 Private · code only","🔒 Privé · avec le code","🔒 خاصة · بالرمز فقط"],["🌍 Public · anyone can find it","🌍 Public · visible par tous","🌍 عامة · يراها الجميع"],["Max players","Joueurs max","الحد الأقصى للاعبين"],["Room name in the public list","Nom du salon dans la liste publique","اسم الغرفة في القائمة العامة"],
["Create room","Créer le salon","أنشئ الغرفة"],["Join a room","Rejoindre un salon","انضم إلى غرفة"],["Type the 5-letter code your friend sent you.","Tape le code à 5 lettres envoyé par ton ami.","اكتب الرمز المكوّن من 5 حروف الذي أرسله صديقك."],["Join","Rejoindre","انضم"],["Room code","Code du salon","رمز الغرفة"],
["Demo mode: open this page in another tab to join your own room.","Mode démo : ouvre cette page dans un autre onglet pour rejoindre ton salon.","الوضع التجريبي: افتح الصفحة في تبويب آخر لتنضم إلى غرفتك."],["🌍 Public rooms","🌍 Salons publics","🌍 الغرف العامة"],
["No public rooms right now. Create one and it will show up here for everyone.","Aucun salon public pour l'instant. Crée-en un et il apparaîtra ici pour tous.","لا توجد غرف عامة الآن. أنشئ واحدة وستظهر هنا للجميع."],["⚡ Quick join","⚡ Rejoindre vite","⚡ انضمام سريع"],["Looking for rooms…","Recherche de salons…","جارٍ البحث عن غرف…"],
// room
["📲 Invite","📲 Inviter","📲 دعوة"],["Leave","Quitter","مغادرة"],["Choose the game","Choisis le jeu","اختر اللعبة"],["Next game","Prochain jeu","اللعبة التالية"],["You're the host","Tu es l'hôte","أنت المضيف"],["Race","Course","سباق"],["Team (take turns)","Équipe (chacun son tour)","فريق (بالتناوب)"],
["Era","Époque","الحقبة"],["Born 1990+","Nés en 1990+","مواليد 1990+"],["Before 1990","Avant 1990","قبل 1990"],["Time per turn (team mode)","Temps par tour (mode équipe)","الوقت لكل دور (وضع الفريق)"],
["Room settings","Réglages du salon","إعدادات الغرفة"],["Ranked (rating changes after each game)","Classé (le niveau change après chaque partie)","مصنّفة (يتغير التقييم بعد كل لعبة)"],["🏆 Ranked","🏆 Classé","🏆 مصنّفة"],["Just for fun","Pour le fun","للمتعة فقط"],
["🏆 Tournament mode","🏆 Mode tournoi","🏆 وضع البطولة"],["Several games in a row, one champion","Plusieurs jeux d'affilée, un seul champion","عدة ألعاب متتالية وبطل واحد"],["Theme for every game","Thème pour chaque jeu","موضوع لكل الألعاب"],["Points per game: 1st 5, 2nd 3, 3rd 2, everyone else 1.","Points par jeu : 1er 5, 2e 3, 3e 2, les autres 1.","النقاط لكل لعبة: الأول 5، الثاني 3، الثالث 2، والبقية 1."],
["Chat","Chat","الدردشة"],["Send","Envoyer","إرسال"],["Message…","Message…","رسالة…"],["Chat message","Message","رسالة دردشة"],["Open chat","Ouvrir le chat","فتح الدردشة"],["Room chat","Chat du salon","دردشة الغرفة"],["Quick messages","Messages rapides","رسائل سريعة"],["Say hi 👋","Dis bonjour 👋","قل مرحباً 👋"],
["Nice one! 👏","Bien joué ! 👏","أحسنت! 👏"],["Too easy 😎","Trop facile 😎","سهلة جداً 😎"],["No way 😱","Pas possible 😱","مستحيل 😱"],["GG 🤝","GG 🤝","GG 🤝"],["Hurry up ⏱","Dépêche-toi ⏱","أسرع ⏱"],["One more? 🔁","Encore une ? 🔁","واحدة أخرى؟ 🔁"],["Haha 😂","Haha 😂","هههه 😂"],["Unlucky 😅","Pas de chance 😅","حظ سيئ 😅"],
["Points in this room","Points dans ce salon","النقاط في هذه الغرفة"],["Tournament theme","Thème du tournoi","موضوع البطولة"],["Invite friends","Inviter des amis","دعوة الأصدقاء"],["Copy link","Copier le lien","نسخ الرابط"],["Share…","Partager…","مشاركة…"],["Invite link","Lien d'invitation","رابط الدعوة"],
["Friends next to you can scan it with their phone camera.","Les amis à côté de toi peuvent le scanner avec l'appareil photo.","يمكن لأصدقائك بجانبك مسحه بكاميرا الهاتف."],["Loading QR code…","Chargement du QR code…","جارٍ تحميل رمز QR…"],
["3 rounds","3 manches","3 جولات"],["5 rounds","5 manches","5 جولات"],["8 rounds","8 manches","8 جولات"],["Time","Temps","الوقت"],["Scoring","Points","احتساب النقاط"],["Unique ×2","Unique ×2","الفريد ×2"],["1 point each","1 point chacun","نقطة لكل إجابة"],
["5 cards","5 cartes","5 بطاقات"],["7 cards","7 cartes","7 بطاقات"],["9 cards","9 cartes","9 بطاقات"],["30s turns","Tours de 30 s","أدوار 30 ث"],["45s turns","Tours de 45 s","أدوار 45 ث"],["No timer","Sans chrono","بدون مؤقت"],["Computer players","Joueurs ordinateur","لاعبو الكمبيوتر"],["No CPU","Sans ordinateur","بدون كمبيوتر"],["+1 CPU","+1 ordi","+1 كمبيوتر"],["+2 CPU","+2 ordis","+2 كمبيوتر"],["Easy CPU","Ordi facile","كمبيوتر سهل"],["Normal CPU","Ordi normal","كمبيوتر عادي"],["Hard CPU","Ordi difficile","كمبيوتر صعب"],
["Link Up needs 2 seats: invite a friend or add a CPU.","Link Up se joue à 2 minimum : invite un ami ou ajoute l'ordinateur.","لعبة الربط تحتاج مقعدين: ادعُ صديقاً أو أضف الكمبيوتر."],["Clue speed","Vitesse des indices","سرعة التلميحات"],["Clue every 5s","Indice toutes les 5 s","تلميح كل 5 ث"],["Every 7s","Toutes les 7 s","كل 7 ث"],["Every 10s","Toutes les 10 s","كل 10 ث"],["Club speed","Vitesse des clubs","سرعة الأندية"],["Club every 5s","Club toutes les 5 s","نادٍ كل 5 ث"],["30s matches","Matchs de 30 s","مباريات 30 ث"],
["Guess the Player · race","Devine le joueur · course","خمّن اللاعب · سباق"],["First to find the secret footballer wins","Le premier qui trouve le joueur secret gagne","أول من يجد اللاعب السري يفوز"],["thinking…","réfléchit…","يفكر…"],["Give up (ask the team)","Abandonner (demander à l'équipe)","استسلام (اسأل الفريق)"],["Closer player (uses your turn)","Joueur plus proche (utilise ton tour)","لاعب أقرب (يستهلك دورك)"],
["Team guesses, closest first","Essais de l'équipe, du plus proche au plus loin","محاولات الفريق، الأقرب أولاً"],["Final standings","Classement final","الترتيب النهائي"],["Closest players","Joueurs les plus proches","أقرب اللاعبين"],["The secret player","Le joueur secret","اللاعب السري"],["Team guesses","Essais de l'équipe","محاولات الفريق"],
["Waiting for the host to start the next game…","En attente du prochain jeu lancé par l'hôte…","بانتظار أن يبدأ المضيف اللعبة التالية…"],["🤝 Draw · everyone agreed to stop","🤝 Match nul · tout le monde a accepté d'arrêter","🤝 تعادل · اتفق الجميع على التوقف"],["Nobody found it this time","Personne n'a trouvé cette fois","لم يجده أحد هذه المرة"],
["🤝 Accept draw","🤝 Accepter le nul","🤝 قبول التعادل"],["💪 Keep playing","💪 Continuer","💪 تابع اللعب"],["🤝 Yes, stop","🤝 Oui, arrêter","🤝 نعم، توقف"],["🏳️ Give up alone","🏳️ Abandonner seul","🏳️ استسلم وحدك"],["OK","OK","حسناً"],["Waiting for answer…","En attente de réponse…","بانتظار الرد…"],["Waiting for the team…","En attente de l'équipe…","بانتظار الفريق…"],
["Name the mystery footballer","Trouve le joueur mystère","اعرف اللاعب الغامض"],["Whose career is this?","À qui est cette carrière ?","لمن هذه المسيرة؟"],["Earlier clue = more points · first correct +2","Indice plus tôt = plus de points · premier correct +2","تلميح أبكر = نقاط أكثر · أول إجابة صحيحة +2"],["Last clue","Dernier indice","آخر تلميح"],["You got it! Waiting for the others…","Trouvé ! En attente des autres…","وجدته! بانتظار الآخرين…"],
["Starts with","Commence par","يبدأ بـ"],["Your turn!","À toi !","دورك!"],["Your turn","À toi de jouer","دورك"],["Your turn: make a guess","À toi : propose un joueur","دورك: خمّن لاعباً"],["Wait for your turn…","Attends ton tour…","انتظر دورك…"],["Game over","Partie terminée","انتهت اللعبة"],["Pick a card and name a player who links them.","Choisis une carte et cite un joueur qui les relie.","اختر بطاقة واذكر لاعباً يربطهما."],
["Play again","Rejouer","العب مجدداً"],["Crown the champion 👑","Couronner le champion 👑","تتويج البطل 👑"],["End tournament","Terminer le tournoi","إنهاء البطولة"],["Close tournament","Fermer le tournoi","إغلاق البطولة"],["Tournament over","Tournoi terminé","انتهت البطولة"],
["Make host","Nommer hôte","اجعله المضيف"],["Remove from room","Retirer du salon","إخراج من الغرفة"],["👥 Add friend","👥 Ajouter en ami","👥 إضافة صديق"],["Friends ✓","Amis ✓","أصدقاء ✓"],["Request sent","Demande envoyée","تم إرسال الطلب"],["Friend request sent","Demande d'ami envoyée","تم إرسال طلب الصداقة"],["Accept friend request","Accepter la demande","قبول طلب الصداقة"],["That's you!","C'est toi !","هذا أنت!"],
// friends, profile, challenges, leaderboards
["Friends","Amis","الأصدقاء"],["Your friend code","Ton code ami","رمز صداقتك"],["Copy code","Copier le code","نسخ الرمز"],["Add a friend","Ajouter un ami","إضافة صديق"],["Add","Ajouter","أضف"],["Friend code","Code ami","رمز الصداقة"],
["You can also tap a player's name in any room to add them.","Tu peux aussi toucher le nom d'un joueur dans un salon pour l'ajouter.","يمكنك أيضاً لمس اسم لاعب في أي غرفة لإضافته."],["No friends yet. Share your code, add someone's code above, or tap a player's name in any room.","Pas encore d'amis. Partage ton code, ajoute le code de quelqu'un ou touche un nom dans un salon.","لا أصدقاء بعد. شارك رمزك أو أضف رمز أحدهم أو المس اسم لاعب في غرفة."],
["Send it to friends so they can add you. As a guest your friends are saved on this device; sign in with Google to keep them on every device.","Envoie-le à tes amis pour qu'ils t'ajoutent. En invité, tes amis sont enregistrés sur cet appareil ; connecte-toi avec Google pour les garder partout.","أرسله لأصدقائك ليضيفوك. كضيف يُحفظ أصدقاؤك على هذا الجهاز؛ سجّل الدخول بـGoogle لتحتفظ بهم على كل الأجهزة."],
["← Play online","← Jouer en ligne","← العب أونلاين"],["Friend requests","Demandes d'ami","طلبات الصداقة"],["Accept","Accepter","قبول"],["Decline","Refuser","رفض"],["Invite","Inviter","دعوة"],["Online now","En ligne","متصل الآن"],["Offline","Hors ligne","غير متصل"],["Remove?","Retirer ?","إزالة؟"],
["Badges","Badges","الشارات"],["Games","Jeux","الألعاب"],["No online games yet.","Aucune partie en ligne pour l'instant.","لا ألعاب أونلاين بعد."],["🎯 Daily & weekly challenges","🎯 Défis du jour et de la semaine","🎯 تحديات يومية وأسبوعية"],["best challenge streak","meilleure série de défis","أفضل سلسلة تحديات"],
["First win","Première victoire","أول فوز"],["Win an online game","Gagner une partie en ligne","الفوز بلعبة أونلاين"],["Ten wins","Dix victoires","عشرة انتصارات"],["Win 10 online games","Gagner 10 parties en ligne","الفوز بـ10 ألعاب أونلاين"],["Fifty wins","Cinquante victoires","خمسون انتصاراً"],["Win 50 online games","Gagner 50 parties en ligne","الفوز بـ50 لعبة أونلاين"],["Regular","Habitué","لاعب دائم"],["Play 25 online games","Jouer 25 parties en ligne","لعب 25 لعبة أونلاين"],
["Gold division","Division Or","الدرجة الذهبية"],["Reach a 1300 rating","Atteindre 1300 de niveau","الوصول إلى تقييم 1300"],["Reach a 1700 rating","Atteindre 1700 de niveau","الوصول إلى تقييم 1700"],["Champion","Champion","البطل"],["Win a tournament","Gagner un tournoi","الفوز ببطولة"],["World champion","Champion du monde","بطل العالم"],["Win an online World Cup Run","Gagner une Coupe du monde en ligne","الفوز بمشوار كأس العالم أونلاين"],
["Sniper","Sniper","القناص"],["Find the secret player with your first guess","Trouver le joueur secret du premier coup","إيجاد اللاعب السري من أول محاولة"],["On fire","En feu","مشتعل"],["Finish all daily challenges 5 days in a row","Finir tous les défis du jour 5 jours de suite","إكمال كل التحديات اليومية 5 أيام متتالية"],["All-rounder","Polyvalent","متعدد المهارات"],["Win 4 different online games","Gagner à 4 jeux en ligne différents","الفوز في 4 ألعاب أونلاين مختلفة"],["Level 10","Niveau 10","المستوى 10"],["Earn 4,050 XP","Gagner 4 050 XP","اربح 4050 نقطة خبرة"],["Legend","Légende","أسطورة"],
["New daily challenges every day, new weekly ones every Monday. Finish them for XP. Clear all three daily challenges to grow your streak (🔥 0 days).","De nouveaux défis chaque jour, et chaque lundi pour la semaine. Termine-les pour gagner de l'XP. Finis les trois défis du jour pour faire grandir ta série (🔥 0 jour).","تحديات يومية جديدة كل يوم وأسبوعية كل اثنين. أكملها لتربح نقاط الخبرة. أنهِ التحديات اليومية الثلاثة لتطيل سلسلتك (🔥 0 يوم)."],
["Today","Aujourd'hui","اليوم"],["This week","Cette semaine","هذا الأسبوع"],["Online challenges count when you're signed in to Play online. Progress is saved on this device.","Les défis en ligne comptent quand tu es connecté à Jouer en ligne. La progression est enregistrée sur cet appareil.","تُحسب التحديات الأونلاين عند تسجيل دخولك. يُحفظ التقدم على هذا الجهاز."],["Today's Daily match","Match du jour","مباراة اليوم"],
["Play 2 online games","Jouer 2 parties en ligne","لعب لعبتين أونلاين"],["Name 10 players in 30 Seconds, Letter Rush or World Cup Run","Citer 10 joueurs dans 30 secondes, Course aux lettres ou Coupe du monde","ذكر 10 لاعبين في 30 ثانية أو سباق الحروف أو كأس العالم"],["Solve today's Daily match in Guess the Player","Résoudre le match du jour de Devine le joueur","حلّ مباراة اليوم في خمّن اللاعب"],["Solve the Daily match in 6 guesses or fewer","Résoudre le match du jour en 6 essais ou moins","حلّ مباراة اليوم في 6 محاولات أو أقل"],
["Name a Who Am I? or Career Path player by clue 3","Trouver un joueur de Qui suis-je ? ou Parcours avant le 4e indice","اعرف لاعب «من أنا؟» أو «المسيرة» قبل التلميح الرابع"],["Play a game of Link Up","Jouer une partie de Link Up","العب جولة من الربط"],["Add 5 names in Name Chain","Ajouter 5 noms dans Chaîne de noms","أضف 5 أسماء في سلسلة الأسماء"],["Invite a friend to a room","Inviter un ami dans un salon","ادعُ صديقاً إلى غرفة"],["Reach the World Cup quarter-finals","Atteindre les quarts de la Coupe du monde","الوصول إلى ربع نهائي كأس العالم"],
["Play 10 online games","Jouer 10 parties en ligne","لعب 10 ألعاب أونلاين"],["Win 5 online games","Gagner 5 parties en ligne","الفوز بـ5 ألعاب أونلاين"],["Name 60 players in timed games","Citer 60 joueurs dans les jeux chronométrés","ذكر 60 لاعباً في الألعاب المؤقتة"],["Solve the Daily match on 5 days","Résoudre le match du jour 5 jours","حلّ مباراة اليوم في 5 أيام"],["Win the World Cup (solo or online)","Gagner la Coupe du monde (solo ou en ligne)","الفوز بكأس العالم (فردي أو أونلاين)"],["Make a new friend","Se faire un nouvel ami","تكوين صديق جديد"],["Name 5 mystery players by clue 3","Trouver 5 joueurs mystère avant le 4e indice","اعرف 5 لاعبين غامضين قبل التلميح الرابع"],
["This month","Ce mois-ci","هذا الشهر"],["Today's Guess the Player","Devine le joueur du jour","خمّن اللاعب اليوم"],["Ratings","Niveaux","التقييمات"],["Leaderboards need online play, which isn't switched on in demo mode.","Les classements nécessitent le jeu en ligne, désactivé en mode démo.","الترتيب يحتاج اللعب أونلاين، وهو غير مفعّل في الوضع التجريبي."],["Loading…","Chargement…","جارٍ التحميل…"],["Play today's match","Jouer le match du jour","العب مباراة اليوم"],["Loading profile…","Chargement du profil…","جارٍ تحميل الملف…"],
// settings
["Theme","Thème","المظهر"],["Auto","Auto","تلقائي"],["Light","Clair","فاتح"],["Dark","Sombre","داكن"],["Text size","Taille du texte","حجم النص"],["Large","Grand","كبير"],["Extra large","Très grand","كبير جداً"],["Sound effects","Effets sonores","المؤثرات الصوتية"],["On","Activé","تشغيل"],["Vibration","Vibration","الاهتزاز"],["Language","Langue","اللغة"],
["Notifications","Notifications","الإشعارات"],["🔔 Turn on notifications","🔔 Activer les notifications","🔔 تفعيل الإشعارات"],["🔔 On","🔔 Activées","🔔 مفعّلة"],["Turn off","Désactiver","إيقاف"],["Install as an app","Installer comme une appli","ثبّته كتطبيق"],["App","Appli","التطبيق"],["📲 Install Matchday Arcade","📲 Installer Matchday Arcade","📲 ثبّت ماتش داي أركيد"],
["You were in room","Tu étais dans le salon","كنت في الغرفة"],["You're still in room","Tu es toujours dans le salon","ما زلت في الغرفة"],["Rejoin","Revenir","عودة"],["Back to room","Retour au salon","العودة إلى الغرفة"],["Dismiss","Ignorer","تجاهل"],
["Each player's name must start (first name or surname) with the last letter of the previous name. Cristiano Ronaldo → Onana → Antoine Griezmann → Nani… No repeats. Run out of time and you're out.","Le nom de chaque joueur (prénom ou nom) doit commencer par la dernière lettre du précédent. Cristiano Ronaldo → Onana → Antoine Griezmann → Nani… Pas de répétition. Si le temps est écoulé, tu es éliminé.","يجب أن يبدأ اسم كل لاعب (الاسم أو اللقب) بآخر حرف من الاسم السابق. كريستيانو رونالدو ← أونانا ← أنطوان غريزمان ← ناني… بلا تكرار. إذا انتهى وقتك تخرج."],
["Two to four players, one phone or computer. Take turns guessing the same secret footballer. Everyone sees every guess, so use the others' clues. Whoever names the secret player wins.","De deux à quatre joueurs, un seul téléphone ou ordinateur. Cherchez à tour de rôle le même footballeur secret. Tout le monde voit tous les essais, profitez des indices des autres. Celui qui trouve le joueur secret gagne.","من لاعبين إلى أربعة على هاتف أو حاسوب واحد. تناوبوا على تخمين نفس اللاعب السري. الجميع يرى كل المحاولات، فاستفد من تلميحات الآخرين. من يذكر اللاعب السري يفوز."],
["Clues appear one at a time. Name the mystery footballer as early as you can: the first clue is worth 10 points, each extra clue costs 1, and a wrong guess costs 1. Five players per game.","Les indices apparaissent un par un. Trouve le joueur mystère le plus tôt possible : le premier indice vaut 10 points, chaque indice en plus coûte 1, et une erreur coûte 1. Cinq joueurs par partie.","تظهر التلميحات واحداً تلو الآخر. اعرف اللاعب الغامض بأسرع ما يمكن: التلميح الأول يساوي 10 نقاط، وكل تلميح إضافي يكلف نقطة، والإجابة الخاطئة تكلف نقطة. خمسة لاعبين في كل لعبة."],
["A player's career appears club by club, oldest first. Name the player as early as you can: the first club is worth 10 points, each extra club costs 1, and a wrong guess costs 1. Five players per game.","La carrière d'un joueur apparaît club par club, du plus ancien au plus récent. Trouve-le le plus tôt possible : le premier club vaut 10 points, chaque club en plus coûte 1, et une erreur coûte 1. Cinq joueurs par partie.","تظهر مسيرة اللاعب نادياً تلو الآخر من الأقدم. اعرفه بأسرع ما يمكن: النادي الأول يساوي 10 نقاط، وكل نادٍ إضافي يكلف نقطة، والإجابة الخاطئة تكلف نقطة. خمسة لاعبين في كل لعبة."],
["Two nations can't be linked, since a player has one nationality here.","Deux nations ne peuvent pas être reliées : ici, un joueur n'a qu'une nationalité.","لا يمكن ربط منتخبين، لأن للاعب جنسية واحدة هنا."],
["Can't think of anyone? Draw a card and your turn ends.","Aucune idée ? Pioche une carte et ton tour se termine.","لا يخطر لك أحد؟ اسحب بطاقة وينتهي دورك."],
["Player data: Transfermarkt via the open transfermarkt-datasets project (snapshot July 2026), plus hand-entered careers for legends who retired before 2012.","Données joueurs : Transfermarkt via le projet ouvert transfermarkt-datasets (instantané de juillet 2026), plus les carrières saisies à la main des légendes retraitées avant 2012.","بيانات اللاعبين: Transfermarkt عبر مشروع transfermarkt-datasets المفتوح (نسخة يوليو 2026)، مع مسيرات أُدخلت يدوياً لأساطير اعتزلوا قبل 2012."],
["Invites, friend requests, your turn and new messages. Works while Matchday is open in the background.","Invitations, demandes d'ami, ton tour et nouveaux messages. Fonctionne quand Matchday est ouvert en arrière-plan.","الدعوات وطلبات الصداقة ودورك والرسائل الجديدة. يعمل عندما يكون ماتش داي مفتوحاً في الخلفية."],
["Invites, friend requests, your turn and new messages, plus a reminder for the Daily match.","Invitations, demandes d'ami, ton tour et nouveaux messages, plus un rappel pour le match du jour.","الدعوات وطلبات الصداقة ودورك والرسائل الجديدة، مع تذكير بمباراة اليوم."],
["Room ·","Salon ·","الغرفة ·"],["Latest ·","Dernier ·","الأحدث ·"],["Guess the Player · Unlimited","Devine le joueur · Illimité","خمّن اللاعب · غير محدود"],["Match","Match","مباراة"],
["Installed. You're using the app ✓","Installée. Tu utilises l'appli ✓","مثبّت. أنت تستخدم التطبيق ✓"],
["A low number means you're close. If Rivaldo ranks in the top 10, the answer is probably Brazilian and played for Barcelona or Milan.","Un petit nombre veut dire que tu es proche. Si Rivaldo est dans le top 10, la réponse est sûrement brésilienne et passée par Barcelone ou Milan.","الرقم الصغير يعني أنك قريب. إذا كان ريفالدو ضمن أفضل 10، فالإجابة على الأرجح برازيلية ولعبت لبرشلونة أو ميلان."],
["Premier League","Premier League","الدوري الإنجليزي"],["LaLiga","LaLiga","الدوري الإسباني"],["Serie A","Serie A","الدوري الإيطالي"],["Bundesliga","Bundesliga","الدوري الألماني"],["Ligue 1","Ligue 1","الدوري الفرنسي"],["Saudi Pro League","Saudi Pro League","دوري روشن السعودي"],
["Ratings go up and down after every ranked online game, like chess Elo. Everyone starts at 1000. Divisions: 🥉 Bronze · 🥈 Silver 1100 · 🥇 Gold 1300 · 💠 Platinum 1500 · 👑 Legend 1700.","Le niveau monte et descend après chaque partie classée, comme l'Elo aux échecs. Tout le monde commence à 1000. Divisions : 🥉 Bronze · 🥈 Argent 1100 · 🥇 Or 1300 · 💠 Platine 1500 · 👑 Légende 1700.","يرتفع التقييم وينخفض بعد كل لعبة مصنّفة، مثل تصنيف إيلو في الشطرنج. يبدأ الجميع من 1000. الدرجات: 🥉 برونزي · 🥈 فضي 1100 · 🥇 ذهبي 1300 · 💠 بلاتيني 1500 · 👑 أسطورة 1700."],
["No rated players yet.","Aucun joueur classé pour l'instant.","لا يوجد لاعبون مصنّفون بعد."],
// toasts & messages
["Type a name first.","Tape d'abord un pseudo.","اكتب اسماً أولاً."],["Room codes have 5 letters.","Les codes de salon ont 5 lettres.","رموز الغرف من 5 حروف."],["Invite link copied","Lien d'invitation copié","تم نسخ رابط الدعوة"],["Friend code copied","Code ami copié","تم نسخ رمز الصداقة"],["Friend request sent ✓","Demande d'ami envoyée ✓","تم إرسال طلب الصداقة ✓"],["You're now friends 🤝","Vous êtes maintenant amis 🤝","أصبحتما صديقين 🤝"],["Friend removed","Ami retiré","تمت إزالة الصديق"],
["Wait for your turn.","Attends ton tour.","انتظر دورك."],["Two nations can't be linked.","Deux nations ne peuvent pas être reliées.","لا يمكن ربط منتخبين."],["🔔 Notifications on","🔔 Notifications activées","🔔 تم تفعيل الإشعارات"],["🔕 Notifications off","🔕 Notifications désactivées","🔕 تم إيقاف الإشعارات"],
["Time!","Temps écoulé !","انتهى الوقت!"],["Full time!","Coup de sifflet final !","صافرة النهاية!"],["You'd better hurry!","Dépêche-toi !","أسرع!"],["Nothing this round","Rien cette manche","لا شيء في هذه الجولة"],["You covered them all.","Tu les as tous trouvés.","ذكرتهم جميعاً."],["No points yet","Pas encore de points","لا نقاط بعد"],["Nobody scored","Personne n'a marqué","لم يسجل أحد"],["No points scored","Aucun point marqué","لم تُسجَّل نقاط"],
].forEach(r=>add(...r));

/* ---------- patterns: sentences with names or numbers ---------- */
const w=s=>{ const t=W[lang]; if(t&&t[s]!=null) return t[s]; const c=C[lang]; if(c&&c[s]!=null) return c[s]; const d=D[lang]; if(d&&d[s]!=null) return d[s]; return s; };
const cty=s=>{ const m=s.match(/^(\S+)\s(.+)$/); if(m&&C[lang][m[2]]) return m[1]+" "+C[lang][m[2]]; return C[lang][s]||s; };
const lg=s=>{ const m=s.match(/^football in (.+)$/); if(m) return lang==="fr"?`le football en ${w(m[1])}`:`كرة القدم في ${w(m[1])}`; return s; };
const P={
 fr:[
  [/^(\S+) (.+) joined the room$/,(a,n)=>`${a} ${n} a rejoint le salon`],
  [/^(.+) left$/,n=>/\d/.test(n)?null:`${n} est parti`],
  [/^(👑 )?(.+) is now the host$/,(c,n)=>`${c||""}${n} est maintenant l'hôte`],
  [/^(.+) was removed from the room$/,n=>`${n} a été retiré du salon`],
  [/^🏳️ (.+) asks to give up\. Waiting for an answer…$/,n=>`🏳️ ${n} propose d'abandonner. En attente d'une réponse…`],
  [/^💪 (.+) wants to keep playing$/,n=>`💪 ${n} veut continuer`],
  [/^🤝 Draw! Everyone agreed to stop\. The answer is on screen\.$/,()=>"🤝 Match nul ! Tout le monde a accepté d'arrêter. La réponse est à l'écran."],
  [/^🏁 (.+) found the secret player first and wins the race!$/,n=>`🏁 ${n} a trouvé le joueur secret en premier et gagne la course !`],
  [/^🤝 Team win! (.+) found it after (\d+) team guess(?:es)?$/,(n,k)=>`🤝 Victoire d'équipe ! ${n} l'a trouvé après ${k} essai${k>1?"s":""}`],
  [/^Round over\. The answer is on screen\.$/,()=>"Manche terminée. La réponse est à l'écran."],
  [/^🎯 (.+) found the secret player in (\d+) guess(?:es)?!$/,(n,k)=>`🎯 ${n} a trouvé le joueur secret en ${k} essai${k>1?"s":""} !`],
  [/^🔥 (.+) is in the top 10!$/,n=>`🔥 ${n} est dans le top 10 !`],
  [/^🏳️ (.+) gave up(.*)$/,(n,r)=>`🏳️ ${n} a abandonné${r.replace(/ keeps playing$/," continue").replace(/ keep playing$/," continuent")}`],
  [/^Round (\d+): (.+) scored most \(\+(\d+)\)$/,(r,n,p)=>`Manche ${r} : ${n} a marqué le plus (+${p})`],
  [/^🏆 (.+) won (.+) with (\d+) points$/,(n,g,p)=>`🏆 ${n} remporte ${w(g)} avec ${p} points`],
  [/^🏆 (.+) wins (Name Chain|Link Up)!(.*)$/,(n,g,r)=>`🏆 ${n} remporte ${w(g)} !${r.replace(/ The chain reached (\d+) names\./," La chaîne a atteint $1 noms.")}`],
  [/^⛓️ Chain over at (\d+) names$/,k=>`⛓️ Chaîne terminée à ${k} noms`],
  [/^⏱ (.+) ran out of time and is out$/,n=>`⏱ ${n} n'a plus de temps et est éliminé`],
  [/^👑 (.+) is the tournament champion!$/,n=>`👑 ${n} est le champion du tournoi !`],
  [/^🏆 World Cup winners?: (.+)!$/,n=>`🏆 Vainqueur de la Coupe du monde : ${n} !`],
  [/^🏟️ Nobody lifted the trophy this time$/,()=>"🏟️ Personne n'a soulevé le trophée cette fois"],
  [/^🏟️ (.+) vs (.+): (\d+)\/(\d+) through$/,(s,o,a,b)=>`🏟️ ${w(s)} contre ${cty(o)} : ${a}/${b} qualifiés`],
  [/^❓ It was (.+)$/,n=>`❓ C'était ${n}`],
  [/^Guess the Player #(\d+)$/,n=>`Devine le joueur n°${n}`],
  [/^Each guess shows how close it is to the secret player: #(.+) means no link, #1 is the answer\.$/,n=>`Chaque essai montre sa proximité avec le joueur secret : n°${n} = aucun lien, n°1 = la réponse.`],
  [/^Start with any player\. Each guess shows how close it is to the secret player, from #(.+) \(no link at all\) to #1 \(the answer\)\. For example, if the answer were Ronaldinho:$/,n=>`Commence avec n'importe quel joueur. Chaque essai montre sa proximité avec le joueur secret, de n°${n} (aucun lien) à n°1 (la réponse). Par exemple, si la réponse était Ronaldinho :`],
  [/^After the Wild, play a (\w+) card\.$/,c=>`Après le Joker, pose une carte ${w(c)}.`],
  [/^Name a player who fits (.+)$/,c=>`Cite un joueur qui correspond à ${w(c)}`],
  [/^Played for (.+) and (.+)$/,(a,b)=>`A joué pour ${a} et ${b}`],
  [/^Played for (.+)$/,a=>`A joué pour ${a}`],
  [/^(\S+) (.+) players who played in (.+)$/,(f,n,l)=>`Joueurs ${f} ${w(n)} passés par ${lg(l)}`],
  [/^(\S+) (.+) players who played for (.+)$/,(f,n,c)=>`Joueurs ${f} ${w(n)} passés par ${c}`],
  [/^Played under (.+)$/,a=>`A joué sous ${a}`],
  [/^(Goalkeepers|Defenders|Forwards) who played for (.+)$/,(g,c)=>`${w(g)} passés par ${c}`],
  [/^Champions League winners who played for (.+)$/,c=>`Vainqueurs de la Ligue des champions passés par ${c}`],
  [/^Ballon d'Or winners$/,()=>"Lauréats du Ballon d'Or"],
  [/^First name or surname starts with (.)$/,L=>`Prénom ou nom commençant par ${L}`],
  [/^Starts with (.)$/,L=>`Commence par ${L}`],
  [/^A player starting with (.)…$/,L=>`Un joueur commençant par ${L}…`],
  [/^Represents a country in (.+)$/,r=>`Représente un pays d'${w(r)}`],
  [/^Plays as an? (.+)$/,p=>`Joue ${/^[aeiou]/.test(w(p))?"":""}${w(p)}`],
  [/^Born in the (\d+)s$/,d=>`Né dans les années ${d.slice(2)}`],
  [/^Born in (\d+)$/,y=>`Né en ${y}`],
  [/^Has played for (\d+) different clubs$/,n=>`A joué dans ${n} clubs différents`],
  [/^Has spent the whole career at one club$/,()=>"A fait toute sa carrière dans un seul club"],
  [/^Has played in the (.+)$/,l=>`A joué en ${l}`],
  [/^Has played (football in .+)$/,l=>`A joué au ${lg(l).replace(/^le /,"")}`],
  [/^Has only played club football in (.+)$/,c=>`N'a joué en club qu'en ${w(c)}`],
  [/^Nationality: (.+)$/,n=>`Nationalité : ${cty(n)}`],
  [/^Has played for (.+)$/,c=>`A joué pour ${c}`],
  [/^Never left (.+)$/,c=>`N'a jamais quitté ${c}`],
  [/^Initials: (.+)$/,i=>`Initiales : ${i}`],
  [/^(.+) · round (\d+) of (\d+)(.*)$/,(g,a,b,r)=>`${w(g)} · manche ${a} sur ${b}${r.replace(" · results"," · résultats")}`],
  [/^Round (\d+) of (\d+)$/,(a,b)=>`Manche ${a} sur ${b}`],
  [/^(.+)'s turn$/,n=>`Au tour de ${n}`],
  [/^(.+) is guessing…$/,n=>`${n} réfléchit…`],
  [/^Wait: (.+) is guessing$/,n=>`Attends : ${n} réfléchit`],
  [/^Name (.+) players · (\d+) to win$/,(n,k)=>`Cite des joueurs de ${w(n)} · ${k} pour gagner`],
  [/^A (.+) player…$/,n=>`Un joueur de ${w(n)}…`],
  [/^World Cup Run · (.+)$/,s=>`Coupe du monde · ${w(s.replace(" · result",""))}${/ · result$/.test(s)?" · résultat":""}`],
  [/^vs (.+) · (\d+) goals to win$/,(n,k)=>`contre ${cty(n)} · ${k} buts pour gagner`],
  [/^Next match in (\d+)s$/,s=>`Prochain match dans ${s} s`],
  [/^Next: (.+) vs (.+)$/,(s,n)=>`Suivant : ${w(s)} contre ${cty(n)}`],
  [/^(\d+) goals?$/,n=>`${n} but${n>1?"s":""}`],
  [/^(\d+) named$/,n=>`${n} cité${n>1?"s":""}`],
  [/^Next round starts automatically in (\d+)s$/,s=>`La manche suivante démarre dans ${s} s`],
  [/^Next player in (\d+)s$/,s=>`Joueur suivant dans ${s} s`],
  [/^best #(.+) · (\d+) guess(es)?$/,(b,n)=>`meilleur #${b} · ${n} essai${n>1?"s":""}`],
  [/^✓ found it · (\d+) guess(es)?(.*)$/,(n,_,r)=>`✓ trouvé · ${n} essai${n>1?"s":""}${r.replace(/ hints?/," indice(s)")}`],
  [/^Best #(.+)$/,b=>`Meilleur #${b}`],
  [/^Latest · (.+)$/,n=>`Dernier · ${n}`],
  [/^gave up$/,()=>"a abandonné"],
  [/^✓ got it on clue (\d+)$/,n=>`✓ trouvé à l'indice ${n}`],
  [/^clue (\d+)$/,n=>`indice ${n}`],
  [/^Worth (\d+) points$/,n=>`Vaut ${n} points`],
  [/^points now · next clue in (\d+)s$/,s=>`points maintenant · indice suivant dans ${s} s`],
  [/^Clue (\d+) of (\d+) on its way…$/,(a,b)=>`Indice ${a} sur ${b} en approche…`],
  [/^Player (\d+) of (\d+) · score (\d+)(.*)$/,(a,b,c,r)=>`Joueur ${a} sur ${b} · score ${c}${r}`],
  [/^It was (.+)$/,n=>`C'était ${n}`],
  [/^Start (.+)$/,g=>w(g)!==g?`Lancer ${w(g)}`:null],
  [/^(\d+) players? in the room$/,n=>`${n} joueur${n>1?"s":""} dans le salon`],
  [/^Waiting for (.+) to start the game…$/,n=>`En attente du lancement par ${n}…`],
  [/^Host: (.+)$/,n=>`Hôte : ${n}`],
  [/^(🔒 Private|🌍 Public) · (\d+)\/(\d+) players(.*)$/,(v,a,b,r)=>`${v.includes("Private")?"🔒 Privé":"🌍 Public"} · ${a}/${b} joueurs${r.replace("ranked","classé")}`],
  [/^Room · $/,()=>"Salon · "],
  [/^Last seen (.+)$/,t=>`Vu ${ago(t)}`],
  [/^Online · in room (.+)$/,c=>`En ligne · salon ${c}`],
  [/^away · (.+)$/,t=>`absent · ${ago(t)}`],
  [/^Your friends · (\d+)$/,n=>`Tes amis · ${n}`],
  [/^Start tournament \((\d+) games\)$/,n=>`Lancer le tournoi (${n} jeux)`],
  [/^🏆 Tournament · game (\d+) of (\d+)$/,(a,b)=>`🏆 Tournoi · jeu ${a} sur ${b}`],
  [/^(.+) rating$/,d=>`Niveau ${w(d)}`],
  [/^Lv (\d+)$/,n=>`Niv. ${n}`],
  [/^(\S+) (Bronze|Silver|Gold|Platinum|Legend) · (\d+) games$/,(i,d,n)=>`${i} ${w(d)} · ${n} parties`],
  [/^wins · (\d+)% win rate$/,n=>`victoires · ${n} % de réussite`],
  [/^(\d+) wins? · (\d+) played$/,(a,b)=>`${a} victoire${a>1?"s":""} · ${b} jouée${b>1?"s":""}`],
  [/^new in (.+)$/,t=>`nouveaux dans ${t}`],
  [/^(.+) wants to give up$/,n=>`${n} veut abandonner`],
  [/^New daily challenges every day, new weekly ones every Monday\. Finish them for XP\. Clear all three daily challenges to grow your streak \(🔥 (\d+) days?\)\.$/,n=>`De nouveaux défis chaque jour, et chaque lundi pour la semaine. Termine-les pour gagner de l'XP. Finis les trois défis du jour pour faire grandir ta série (🔥 ${n} jour${n>1?"s":""}).`],
  [/^📈 Rating \+(\d+)$/,n=>`📈 Niveau +${n}`],[/^📉 Rating (-\d+)$/,n=>`📉 Niveau ${n}`],
  [/^No answer in (\d+)s counts as “keep playing”\.$/,s=>`Sans réponse dans ${s} s, la partie continue.`],
  [/^Room (\w{5}) is full \((\d+)\/(\d+)\)\.$/,(c,a,b)=>`Le salon ${c} est complet (${a}/${b}).`],
  [/^Room (\w{5}) doesn't exist \(or has closed\)\.$/,c=>`Le salon ${c} n'existe pas (ou est fermé).`],
  [/^(.+) invites you to play (.+)$/,(n,g)=>`${n} t'invite à jouer à ${w(g)}`],
  [/^Room (\w{5}) · (.+)$/,(c,t)=>`Salon ${c} · ${ago(t)}`],
  [/^👥 (.+) sent you a friend request$/,n=>`👥 ${n} t'a envoyé une demande d'ami`],
  [/^Invite sent to (.+) ✓$/,n=>`Invitation envoyée à ${n} ✓`],
  [/^🟢 (.+) is online$/,n=>`🟢 ${n} est en ligne`],
  [/^✅ Challenge complete: (.+) \(\+(\d+) XP\)$/,(c,x)=>`✅ Défi réussi : ${w(c)} (+${x} XP)`],
  [/^No player called “(.+)” in the database\.$/,v=>`Aucun joueur nommé « ${v} » dans la base.`],
  [/^(.+) doesn't fit\.$/,n=>`${n} ne correspond pas.`],
  [/^(.+) is already on your list\.$/,n=>`${n} est déjà dans ta liste.`],
  [/^(.+) isn't from (.+)\.$/,(n,c)=>`${n} n'est pas de ${w(c)}.`],
  [/^⚽ Goal! (.+)$/,n=>`⚽ But ! ${n}`],
  [/^✓ (.+) links them\.$/,n=>`✓ ${n} les relie.`],
  [/^Hint: (.+) is #(.+)\.$/,(n,r)=>`Indice : ${n} est n°${r}.`],
  [/^Who links (.+) and (.+)\?$/,(a,b)=>`Qui relie ${w(a)} et ${w(b)} ?`],
  [/^On the table: (.+)$/,a=>`Sur la table : ${a}`],
 ],
 ar:[
  [/^(\S+) (.+) joined the room$/,(a,n)=>`${a} انضم ${n} إلى الغرفة`],
  [/^(.+) left$/,n=>/\d/.test(n)?null:`غادر ${n}`],
  [/^(👑 )?(.+) is now the host$/,(c,n)=>`${c||""}${n} هو المضيف الآن`],
  [/^(.+) was removed from the room$/,n=>`تم إخراج ${n} من الغرفة`],
  [/^🏳️ (.+) asks to give up\. Waiting for an answer…$/,n=>`🏳️ ${n} يطلب الاستسلام. بانتظار الرد…`],
  [/^💪 (.+) wants to keep playing$/,n=>`💪 ${n} يريد متابعة اللعب`],
  [/^🤝 Draw! Everyone agreed to stop\. The answer is on screen\.$/,()=>"🤝 تعادل! اتفق الجميع على التوقف. الإجابة على الشاشة."],
  [/^🏁 (.+) found the secret player first and wins the race!$/,n=>`🏁 ${n} وجد اللاعب السري أولاً وفاز بالسباق!`],
  [/^🤝 Team win! (.+) found it after (\d+) team guess(?:es)?$/,(n,k)=>`🤝 فوز الفريق! وجده ${n} بعد ${k} محاولة`],
  [/^Round over\. The answer is on screen\.$/,()=>"انتهت الجولة. الإجابة على الشاشة."],
  [/^🎯 (.+) found the secret player in (\d+) guess(?:es)?!$/,(n,k)=>`🎯 وجد ${n} اللاعب السري في ${k} محاولة!`],
  [/^🔥 (.+) is in the top 10!$/,n=>`🔥 ${n} ضمن أفضل 10!`],
  [/^🏳️ (.+) gave up(.*)$/,(n,r)=>`🏳️ استسلم ${n}${r.replace(/ keeps? playing$/," يواصل اللعب")}`],
  [/^Round (\d+): (.+) scored most \(\+(\d+)\)$/,(r,n,p)=>`الجولة ${r}: ${n} سجّل الأكثر (+${p})`],
  [/^🏆 (.+) won (.+) with (\d+) points$/,(n,g,p)=>`🏆 فاز ${n} بـ${w(g)} برصيد ${p} نقطة`],
  [/^🏆 (.+) wins (Name Chain|Link Up)!(.*)$/,(n,g,r)=>`🏆 فاز ${n} بـ${w(g)}!${r.replace(/ The chain reached (\d+) names\./," وصلت السلسلة إلى $1 اسماً.")}`],
  [/^⛓️ Chain over at (\d+) names$/,k=>`⛓️ انتهت السلسلة عند ${k} اسماً`],
  [/^⏱ (.+) ran out of time and is out$/,n=>`⏱ انتهى وقت ${n} وخرج`],
  [/^👑 (.+) is the tournament champion!$/,n=>`👑 ${n} بطل البطولة!`],
  [/^🏆 World Cup winners?: (.+)!$/,n=>`🏆 بطل كأس العالم: ${n}!`],
  [/^🏟️ Nobody lifted the trophy this time$/,()=>"🏟️ لم يرفع أحد الكأس هذه المرة"],
  [/^🏟️ (.+) vs (.+): (\d+)\/(\d+) through$/,(s,o,a,b)=>`🏟️ ${w(s)} ضد ${cty(o)}: تأهل ${a}/${b}`],
  [/^❓ It was (.+)$/,n=>`❓ كان ${n}`],
  [/^Guess the Player #(\d+)$/,n=>`خمّن اللاعب رقم ${n}`],
  [/^Each guess shows how close it is to the secret player: #(.+) means no link, #1 is the answer\.$/,n=>`كل محاولة تبيّن قربها من اللاعب السري: ${n} تعني لا رابط، و1 هو الإجابة.`],
  [/^Start with any player\. Each guess shows how close it is to the secret player, from #(.+) \(no link at all\) to #1 \(the answer\)\. For example, if the answer were Ronaldinho:$/,n=>`ابدأ بأي لاعب. كل محاولة تبيّن قربها من اللاعب السري، من ${n} (لا رابط) إلى 1 (الإجابة). مثلاً، لو كانت الإجابة رونالدينيو:`],
  [/^After the Wild, play a (\w+) card\.$/,c=>`بعد الجوكر، العب بطاقة ${w(c)}.`],
  [/^Name a player who fits (.+)$/,c=>`اذكر لاعباً يطابق ${w(c)}`],
  [/^Played for (.+) and (.+)$/,(a,b)=>`لعب لـ${a} و${b}`],
  [/^Played for (.+)$/,a=>`لعب لـ${a}`],
  [/^(\S+) (.+) players who played in (.+)$/,(f,n,l)=>`لاعبو ${f} ${w(n)} الذين لعبوا في ${lg(l)}`],
  [/^(\S+) (.+) players who played for (.+)$/,(f,n,c)=>`لاعبو ${f} ${w(n)} الذين لعبوا لـ${c}`],
  [/^Played under (.+)$/,a=>`لعب تحت قيادة ${a}`],
  [/^(Goalkeepers|Defenders|Forwards) who played for (.+)$/,(g,c)=>`${w(g)} الذين لعبوا لـ${c}`],
  [/^Champions League winners who played for (.+)$/,c=>`أبطال دوري الأبطال الذين لعبوا لـ${c}`],
  [/^Ballon d'Or winners$/,()=>"الفائزون بالكرة الذهبية"],
  [/^First name or surname starts with (.)$/,L=>`الاسم أو اللقب يبدأ بحرف ${L}`],
  [/^Starts with (.)$/,L=>`يبدأ بحرف ${L}`],
  [/^A player starting with (.)…$/,L=>`لاعب يبدأ بحرف ${L}…`],
  [/^Represents a country in (.+)$/,r=>`يمثل منتخباً من ${w(r)}`],
  [/^Plays as an? (.+)$/,p=>`يلعب في مركز ${w(p)}`],
  [/^Born in the (\d+)s$/,d=>`وُلد في ${d}ات`],
  [/^Born in (\d+)$/,y=>`وُلد سنة ${y}`],
  [/^Has played for (\d+) different clubs$/,n=>`لعب لـ${n} أندية مختلفة`],
  [/^Has spent the whole career at one club$/,()=>"قضى كل مسيرته في نادٍ واحد"],
  [/^Has played in the (.+)$/,l=>`لعب في ${l}`],
  [/^Has played (football in .+)$/,l=>`لعب ${lg(l)}`],
  [/^Has only played club football in (.+)$/,c=>`لم يلعب للأندية إلا في ${w(c)}`],
  [/^Nationality: (.+)$/,n=>`الجنسية: ${cty(n)}`],
  [/^Has played for (.+)$/,c=>`لعب لـ${c}`],
  [/^Never left (.+)$/,c=>`لم يغادر ${c} أبداً`],
  [/^Initials: (.+)$/,i=>`الأحرف الأولى: ${i}`],
  [/^(.+) · round (\d+) of (\d+)(.*)$/,(g,a,b,r)=>`${w(g)} · الجولة ${a} من ${b}${r.replace(" · results"," · النتائج")}`],
  [/^Round (\d+) of (\d+)$/,(a,b)=>`الجولة ${a} من ${b}`],
  [/^(.+)'s turn$/,n=>`دور ${n}`],
  [/^(.+) is guessing…$/,n=>`${n} يخمّن…`],
  [/^Wait: (.+) is guessing$/,n=>`انتظر: ${n} يخمّن`],
  [/^Name (.+) players · (\d+) to win$/,(n,k)=>`اذكر لاعبين من ${w(n)} · ${k} للفوز`],
  [/^A (.+) player…$/,n=>`لاعب من ${w(n)}…`],
  [/^World Cup Run · (.+)$/,s=>`مشوار كأس العالم · ${w(s.replace(" · result",""))}${/ · result$/.test(s)?" · النتيجة":""}`],
  [/^vs (.+) · (\d+) goals to win$/,(n,k)=>`ضد ${cty(n)} · ${k} أهداف للفوز`],
  [/^Next match in (\d+)s$/,s=>`المباراة التالية بعد ${s} ث`],
  [/^Next: (.+) vs (.+)$/,(s,n)=>`التالي: ${w(s)} ضد ${cty(n)}`],
  [/^(\d+) goals?$/,n=>`${n} ${n==1?"هدف":"أهداف"}`],
  [/^(\d+) named$/,n=>`ذكر ${n}`],
  [/^Next round starts automatically in (\d+)s$/,s=>`تبدأ الجولة التالية بعد ${s} ث`],
  [/^Next player in (\d+)s$/,s=>`اللاعب التالي بعد ${s} ث`],
  [/^best #(.+) · (\d+) guess(es)?$/,(b,n)=>`الأفضل #${b} · ${n} محاولة`],
  [/^✓ found it · (\d+) guess(es)?(.*)$/,(n,_,r)=>`✓ وجده · ${n} محاولة${r.replace(/ (\d+) hints?/," · $1 تلميح")}`],
  [/^Best #(.+)$/,b=>`الأفضل #${b}`],
  [/^Latest · (.+)$/,n=>`الأحدث · ${n}`],
  [/^gave up$/,()=>"استسلم"],
  [/^✓ got it on clue (\d+)$/,n=>`✓ عرفه في التلميح ${n}`],
  [/^clue (\d+)$/,n=>`التلميح ${n}`],
  [/^Worth (\d+) points$/,n=>`تساوي ${n} نقاط`],
  [/^points now · next clue in (\d+)s$/,s=>`نقطة الآن · التلميح التالي بعد ${s} ث`],
  [/^Clue (\d+) of (\d+) on its way…$/,(a,b)=>`التلميح ${a} من ${b} قادم…`],
  [/^Player (\d+) of (\d+) · score (\d+)(.*)$/,(a,b,c,r)=>`اللاعب ${a} من ${b} · النتيجة ${c}${r}`],
  [/^It was (.+)$/,n=>`كان ${n}`],
  [/^Start (.+)$/,g=>w(g)!==g?`ابدأ ${w(g)}`:null],
  [/^(\d+) players? in the room$/,n=>`${n} لاعب في الغرفة`],
  [/^Waiting for (.+) to start the game…$/,n=>`بانتظار أن يبدأ ${n} اللعبة…`],
  [/^Host: (.+)$/,n=>`المضيف: ${n}`],
  [/^(🔒 Private|🌍 Public) · (\d+)\/(\d+) players(.*)$/,(v,a,b,r)=>`${v.includes("Private")?"🔒 خاصة":"🌍 عامة"} · ${a}/${b} لاعبين${r.replace("ranked","مصنّفة")}`],
  [/^Room · $/,()=>"الغرفة · "],
  [/^Last seen (.+)$/,t=>`آخر ظهور ${ago(t)}`],
  [/^Online · in room (.+)$/,c=>`متصل · في الغرفة ${c}`],
  [/^away · (.+)$/,t=>`غائب · ${ago(t)}`],
  [/^Your friends · (\d+)$/,n=>`أصدقاؤك · ${n}`],
  [/^Start tournament \((\d+) games\)$/,n=>`ابدأ البطولة (${n} ألعاب)`],
  [/^🏆 Tournament · game (\d+) of (\d+)$/,(a,b)=>`🏆 البطولة · اللعبة ${a} من ${b}`],
  [/^(.+) rating$/,d=>`تقييم ${w(d)}`],
  [/^Lv (\d+)$/,n=>`المستوى ${n}`],
  [/^(\S+) (Bronze|Silver|Gold|Platinum|Legend) · (\d+) games$/,(i,d,n)=>`${i} ${w(d)} · ${n} لعبة`],
  [/^wins · (\d+)% win rate$/,n=>`فوز · نسبة الفوز ${n}%`],
  [/^(\d+) wins? · (\d+) played$/,(a,b)=>`${a} فوز · ${b} لعبة`],
  [/^new in (.+)$/,t=>`تتجدد بعد ${t}`],
  [/^(.+) wants to give up$/,n=>`${n} يريد الاستسلام`],
  [/^New daily challenges every day, new weekly ones every Monday\. Finish them for XP\. Clear all three daily challenges to grow your streak \(🔥 (\d+) days?\)\.$/,n=>`تحديات يومية جديدة كل يوم وأسبوعية كل اثنين. أكملها لتربح نقاط الخبرة. أنهِ التحديات اليومية الثلاثة لتطيل سلسلتك (🔥 ${n} يوم).`],
  [/^📈 Rating \+(\d+)$/,n=>`📈 التقييم +${n}`],[/^📉 Rating (-\d+)$/,n=>`📉 التقييم ${n}`],
  [/^No answer in (\d+)s counts as “keep playing”\.$/,s=>`عدم الرد خلال ${s} ث يعني متابعة اللعب.`],
  [/^Room (\w{5}) is full \((\d+)\/(\d+)\)\.$/,(c,a,b)=>`الغرفة ${c} ممتلئة (${a}/${b}).`],
  [/^Room (\w{5}) doesn't exist \(or has closed\)\.$/,c=>`الغرفة ${c} غير موجودة (أو أُغلقت).`],
  [/^(.+) invites you to play (.+)$/,(n,g)=>`${n} يدعوك للعب ${w(g)}`],
  [/^Room (\w{5}) · (.+)$/,(c,t)=>`الغرفة ${c} · ${ago(t)}`],
  [/^👥 (.+) sent you a friend request$/,n=>`👥 أرسل لك ${n} طلب صداقة`],
  [/^Invite sent to (.+) ✓$/,n=>`تم إرسال الدعوة إلى ${n} ✓`],
  [/^🟢 (.+) is online$/,n=>`🟢 ${n} متصل الآن`],
  [/^✅ Challenge complete: (.+) \(\+(\d+) XP\)$/,(c,x)=>`✅ تم التحدي: ${w(c)} (+${x} خبرة)`],
  [/^No player called “(.+)” in the database\.$/,v=>`لا يوجد لاعب باسم «${v}» في القاعدة.`],
  [/^(.+) doesn't fit\.$/,n=>`${n} لا يطابق.`],
  [/^(.+) is already on your list\.$/,n=>`${n} موجود في قائمتك.`],
  [/^(.+) isn't from (.+)\.$/,(n,c)=>`${n} ليس من ${w(c)}.`],
  [/^⚽ Goal! (.+)$/,n=>`⚽ هدف! ${n}`],
  [/^✓ (.+) links them\.$/,n=>`✓ ${n} يربطهما.`],
  [/^Hint: (.+) is #(.+)\.$/,(n,r)=>`تلميح: ${n} في المرتبة ${r}.`],
  [/^Who links (.+) and (.+)\?$/,(a,b)=>`من يربط ${w(a)} و${w(b)}؟`],
  [/^On the table: (.+)$/,a=>`على الطاولة: ${a}`],
 ]
};
function ago(t){
  let m;
  if(t==="just now") return lang==="fr"?"à l'instant":"الآن";
  if(t==="yesterday") return lang==="fr"?"hier":"أمس";
  if(t==="a while ago") return lang==="fr"?"il y a un moment":"منذ فترة";
  if(m=t.match(/^(\d+) min ago$/)) return lang==="fr"?`il y a ${m[1]} min`:`منذ ${m[1]} د`;
  if(m=t.match(/^(\d+) h ago$/)) return lang==="fr"?`il y a ${m[1]} h`:`منذ ${m[1]} س`;
  if(m=t.match(/^(\d+) days ago$/)) return lang==="fr"?`il y a ${m[1]} jours`:`منذ ${m[1]} أيام`;
  return t;
}


/* ---------- longer rules text (whole paragraphs, may contain bold words) ---------- */
const BL={
 fr:[
  [/^Guess the Player$/,()=>`Devine le <span style="color:var(--pitch)">joueur</span>`],
  [/^Get rid of all your cards\. To play a card, name a player who links it to the card on the table: Man United → Real Madrid needs someone like Cristiano Ronaldo\. Each player can only be named once per game\.$/,()=>`Débarrasse-toi de toutes tes cartes. Pour poser une carte, <b>cite un joueur qui la relie à la carte posée</b> : Man United → Real Madrid demande quelqu'un comme Cristiano Ronaldo. Chaque joueur ne peut être cité qu'une fois par partie.`],
  [/^Club, Nation, League \(any club in that country\) and Legend cards/,()=>`Cartes <b style="color:var(--c-club)">Club</b>, <b style="color:var(--c-nation)">Nation</b>, <b style="color:var(--c-league)">Ligue</b> (n'importe quel club du pays) et <b style="color:var(--c-legend)">Légende</b> (entraîneurs, Ballon d'Or, Ligue des champions).`],
  [/^Skip and \+2 are played/,()=>`<b>Passe</b> et <b>+2</b> se posent sur une carte de la même couleur, sans citer de nom.`],
  [/^Wild can be played any time/,()=>`<b>Joker</b> se pose à tout moment. Tu choisis la couleur, et la carte suivante n'a besoin que d'un joueur qui lui correspond.`],
  [/^There's a secret footballer\./,()=>`Il y a un footballeur secret. Propose n'importe quel joueur et tu verras son rang de ressemblance avec le joueur secret, sur <b id="helpCount">${pc()}</b> joueurs. Le joueur secret est <b>n°1</b>. Les essais sont illimités.`],
  [/^Similarity comes from/,()=>`La ressemblance vient de la <b>nationalité</b>, des <b>clubs</b>, des <b>championnats</b>, du <b>poste</b> et de l'<b>âge</b>. Les joueurs passés par le même club aux mêmes saisons sont des <b>coéquipiers</b> et gagnent un gros bonus.`],
  [/^A low number means you're close\./,()=>`Un petit nombre veut dire que tu es proche. Si Rivaldo est dans le top 10, la réponse est sûrement brésilienne et passée par Barcelone ou Milan.`],
  [/^The clue chips under each guess/,()=>`Les <b>pastilles d'indice</b> sous chaque essai montrent quel lien correspond. Plein = correspondance exacte, contour = proche (même continent, même zone du terrain, quelques années d'écart). Une pastille rouge <b>Coéquipier</b> veut dire qu'ils ont partagé un vestiaire. Désactive les pastilles ci-dessous pour corser le jeu.`],
  [/^Stuck\? Closer player/,()=>`Bloqué ? <b>Joueur plus proche</b> te donne un nom classé à mi-chemin entre ton meilleur essai et la réponse. Les autres indices révèlent un fait chacun. Les indices comptent dans ton résultat.`],
  [/^Daily match is the same star player/,()=>`<b>Match du jour</b> : la même star pour tout le monde chaque jour. <b>Illimité</b> te donne un nouveau joueur quand tu veux, à la difficulté choisie.`],
  [/^(\d+) guess(?:es)? · (\d+) hints?$/,(a,b)=>`<b>${a}</b> essai${a>1?"s":""} · <b>${b}</b> indice${b>1?"s":""}`],
  [/^(?:Want to play|Playing) with friends\? Choose (.+) in an online room\.$/,g=>`Envie de jouer avec des amis ? Choisis <b>${w(g)}</b> dans un salon en ligne.`],
  [/^(Couldn't reach the online service, so this is|Online play isn't switched on for this copy yet\. This is) demo mode/,a=>`${a[0]==="C"?"Le service en ligne est injoignable, c'est donc le":"Le jeu en ligne n'est pas encore activé sur cette version. C'est le"} <b>mode démo</b> : les salons ne fonctionnent qu'entre les onglets de ce navigateur. Le propriétaire du site active le vrai jeu en ligne en ajoutant une config Firebase (voir le README).`],
  [/^In Safari, tap the Share button/,()=>`Dans Safari, touche le bouton Partager puis <b>Sur l'écran d'accueil</b>. L'appli s'ouvre en plein écran et les jeux sur un appareil marchent hors ligne.`],
  [/^Open your browser menu/,()=>`Ouvre le menu du navigateur (⋮) et choisis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>. L'appli s'ouvre en plein écran et les jeux sur un appareil marchent hors ligne.`],
 ],
 ar:[
  [/^Guess the Player$/,()=>`خمّن <span style="color:var(--pitch)">اللاعب</span>`],
  [/^Get rid of all your cards\. To play a card, name a player who links it to the card on the table: Man United → Real Madrid needs someone like Cristiano Ronaldo\. Each player can only be named once per game\.$/,()=>`تخلّص من كل بطاقاتك. لتلعب بطاقة، <b>اذكر لاعباً يربطها بالبطاقة على الطاولة</b>: مان يونايتد ← ريال مدريد يحتاج لاعباً مثل كريستيانو رونالدو. لا يُذكر كل لاعب إلا مرة واحدة في اللعبة.`],
  [/^Club, Nation, League \(any club in that country\) and Legend cards/,()=>`بطاقات <b style="color:var(--c-club)">النادي</b> و<b style="color:var(--c-nation)">المنتخب</b> و<b style="color:var(--c-league)">الدوري</b> (أي نادٍ في ذلك البلد) و<b style="color:var(--c-legend)">الأسطورة</b> (المدربون، الكرة الذهبية، دوري الأبطال).`],
  [/^Skip and \+2 are played/,()=>`<b>التخطي</b> و<b>+2</b> تُلعبان على بطاقة من نفس اللون دون ذكر اسم.`],
  [/^Wild can be played any time/,()=>`<b>الجوكر</b> يُلعب في أي وقت. تختار اللون، والبطاقة التالية تحتاج فقط لاعباً يطابقها.`],
  [/^There's a secret footballer\./,()=>`هناك لاعب سري. خمّن أي لاعب وسترى ترتيبه حسب التشابه مع اللاعب السري من بين <b id="helpCount">${pc()}</b> لاعب. اللاعب السري هو <b>رقم 1</b>. المحاولات غير محدودة.`],
  [/^Similarity comes from/,()=>`يأتي التشابه من <b>الجنسية</b> و<b>الأندية</b> و<b>الدوريات</b> و<b>المركز</b> و<b>العمر</b>. اللاعبون الذين كانوا في نفس النادي في نفس المواسم يُعدّون <b>زملاء</b> ويحصلون على مكافأة كبيرة.`],
  [/^A low number means you're close\./,()=>`الرقم الصغير يعني أنك قريب. إذا كان ريفالدو ضمن أفضل 10، فالإجابة على الأرجح برازيلية ولعبت لبرشلونة أو ميلان.`],
  [/^The clue chips under each guess/,()=>`<b>شارات التلميح</b> تحت كل محاولة تبيّن نوع الرابط. الممتلئة تعني تطابقاً تاماً، والمحددة تعني قرباً (نفس القارة، نفس منطقة الملعب، فارق سنوات قليلة). الشارة الحمراء <b>زميل</b> تعني أنهما تشاركا غرفة الملابس. أطفئ الشارات بالأسفل لتحدٍّ أصعب.`],
  [/^Stuck\? Closer player/,()=>`عالق؟ <b>لاعب أقرب</b> يعطيك اسماً في منتصف الطريق بين أفضل محاولاتك والإجابة. التلميحات الأخرى تكشف معلومة واحدة لكل منها. تُحسب التلميحات في نتيجتك.`],
  [/^Daily match is the same star player/,()=>`<b>مباراة اليوم</b>: نفس النجم للجميع كل يوم. <b>غير محدود</b> يعطيك لاعباً جديداً متى شئت وبالصعوبة التي تختارها.`],
  [/^(\d+) guess(?:es)? · (\d+) hints?$/,(a,b)=>`<b>${a}</b> محاولة · <b>${b}</b> تلميح`],
  [/^(?:Want to play|Playing) with friends\? Choose (.+) in an online room\.$/,g=>`تريد اللعب مع أصدقائك؟ اختر <b>${w(g)}</b> في غرفة أونلاين.`],
  [/^(Couldn't reach the online service, so this is|Online play isn't switched on for this copy yet\. This is) demo mode/,a=>`${a[0]==="C"?"تعذّر الوصول إلى الخدمة، لذا هذا":"اللعب أونلاين غير مفعّل في هذه النسخة بعد. هذا"} <b>الوضع التجريبي</b>: الغرف تعمل بين تبويبات هذا المتصفح فقط. يفعّل صاحب الموقع اللعب الحقيقي بإضافة إعدادات Firebase (راجع README).`],
  [/^In Safari, tap the Share button/,()=>`في Safari، اضغط زر المشاركة ثم <b>إضافة إلى الشاشة الرئيسية</b>. يفتح بملء الشاشة كتطبيق عادي، وألعاب الجهاز الواحد تعمل دون إنترنت.`],
  [/^Open your browser menu/,()=>`افتح قائمة المتصفح (⋮) واختر <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>. يفتح بملء الشاشة كتطبيق عادي، وألعاب الجهاز الواحد تعمل دون إنترنت.`],
 ]
};
const pc=()=>{ const e=document.querySelector(".pcount"); return e?e.textContent:"7,000+"; };
const BLK="p,li,h2,.note,.ol-note,.lede,.meta-right,#metaRight";
function doBlock(el,force){
  if(!el.matches||!el.matches(BLK)||!el.firstElementChild&&!el.__en) return false;
  if(el.closest(".notranslate,.msg-t")) return false;
  const src=el.__en!=null?el.__en:el.innerHTML;
  const tmp=document.createElement("div"); tmp.innerHTML=src; const txt=tmp.textContent.replace(/\s+/g," ").trim();
  if(el.__en!=null&&el.__out!==el.innerHTML){ el.__en=null; return doBlock(el,force); }  // the page rewrote it
  if(el.__en!=null&&!force&&el.__lang===lang) return true;
  if(lang==="en"){ if(el.__en!=null){ el.innerHTML=el.__en; el.__en=null; el.removeAttribute("data-tr-block"); } return false; }
  for(const [re,f] of BL[lang]){ const m=txt.match(re); if(m){ if(el.__en==null) el.__en=el.innerHTML; el.innerHTML=f(...m.slice(1)); el.__out=el.innerHTML; el.__lang=lang; el.setAttribute("data-tr-block",""); return true; } }
  return false;
}

/* ---------- engine ---------- */
function tCore(s){
  if(lang==="en") return null;
  const d=D[lang]; if(d[s]!=null) return d[s];
  const c=cty(s); if(c!==s) return c;
  if(W[lang][s]!=null) return W[lang][s];
  for(const [re,f] of P[lang]){ const m=s.match(re); if(m){ const r=f(...m.slice(1)); if(r!=null) return r; } }
  return null;
}
function t(s){ if(lang==="en"||!s) return s; const m=String(s).match(/^(\s*)([\s\S]*?)(\s*)$/); const r=tCore(m[2]); return r==null?s:m[1]+r+m[3]; }
const ORIG=new WeakMap(), LAST=new WeakMap();
const SKIP=el=>!el||el.closest&&el.closest("script,style,textarea,.msg-t,.ol-chip,.nm,.tag,.sug .n,.notranslate,input");
function doText(n){
  const p=n.parentElement; if(!p||SKIP(p)) return;
  const cur=n.nodeValue; let o=ORIG.get(n);
  if(o===undefined||cur!==LAST.get(n)){ o=cur; ORIG.set(n,o); }
  const out=lang==="en"?o:t(o);
  if(out!==cur) n.nodeValue=out;
  LAST.set(n,out);
}
const ATTRS=["placeholder","aria-label","title"];
function doAttrs(el){
  if(el.closest&&el.closest(".notranslate")) return;
  for(const a of ATTRS){ if(!el.hasAttribute(a)) continue;
    const k="data-en-"+a, cur=el.getAttribute(a); let o=el.getAttribute(k);
    if(o==null||cur!==el.__l?.[a]){ if(o==null||cur!==t(o)) { o=cur; el.setAttribute(k,o); } }
    const out=lang==="en"?o:t(o); if(out!==cur) el.setAttribute(a,out); (el.__l=el.__l||{})[a]=out; }
}
function walk(root){
  if(root.nodeType===3) return doText(root);
  if(root.nodeType!==1||SKIP(root)&&root.tagName!=="INPUT") { if(root.nodeType===1&&root.tagName==="INPUT") doAttrs(root); return; }
  doAttrs(root); if(doBlock(root,FORCE)) return;
  const it=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT); let n;
  while(n=it.nextNode()){ if(n.nodeType===3){ if(!(n.parentElement&&n.parentElement.closest("[data-tr-block]"))) doText(n); } else { doAttrs(n); doBlock(n,FORCE); } }
}
let busy=false, FORCE=false;
const mo=new MutationObserver(list=>{ if(busy) return; busy=true;
  try{ for(const m of list){ if(m.type==="characterData"){ const b=m.target.parentElement&&m.target.parentElement.closest("[data-tr-block]"); if(!b) doText(m.target); } else if(m.type==="attributes") doAttrs(m.target); else { const bt=m.target.closest&&m.target.closest(BLK); if(bt&&doBlock(bt)) continue; m.addedNodes.forEach(walk); } } } finally { busy=false; } });
function applyDir(){ const h=document.documentElement; h.lang=lang; h.dir=lang==="ar"?"rtl":"ltr"; }
function start(){ applyDir(); walk(document.body); document.title=t(document.title.replace(/^.*$/,"Matchday Arcade"))||document.title;
  mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS}); }
function set(l){ if(!LANGS[l]) return; lang=l; try{ localStorage.setItem("arc-lang",l); }catch(e){} applyDir(); busy=true; FORCE=true; try{ walk(document.body); document.title=t("Matchday Arcade"); } finally { busy=false; FORCE=false; } }
window.I18N={get lang(){ return lang; },LANGS,set,t};
applyDir();
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
