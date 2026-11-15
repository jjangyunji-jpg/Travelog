/**
 * 해양 생물 도감 (직접 정리)
 * 사진은 iNaturalist의 CC 라이선스 사진을 사용 (scripts/fetch-species-photos.mjs 로 생성 → speciesPhotos.json)
 *
 * 바다(region): ip 인도-태평양 열대 · rs 홍해 · nwp 한국·일본 온대 · car 카리브·서대서양 열대
 *               ep 동태평양(갈라파고스·멕시코 태평양) · med 지중해·동대서양 · cold 차가운 바다
 * 크기(size): s 10cm 미만 · m 10~50cm · l 0.5~2m · xl 2m 이상
 */

export type Group =
  | 'shark' | 'ray' | 'turtle' | 'mammal' | 'fish' | 'eel' | 'seahorse'
  | 'nudibranch' | 'cephalopod' | 'crustacean' | 'invert' | 'other'
export type Region = 'ip' | 'rs' | 'nwp' | 'car' | 'ep' | 'med' | 'cold'
export type Size = 's' | 'm' | 'l' | 'xl'

export interface Species {
  key: string
  emoji: string
  ko: string
  en: string
  sci: string
  group: Group
  colors: string[]
  size: Size
  regions: Region[]
}

type Row = [string, string, string, string, string, Group, string, Size, string]

const W = 'ip rs nwp car ep med' // 열대·온대 대부분
const IPR = 'ip rs'

const ROWS: Row[] = [
  // 상어
  ['whaleShark', '🦈', '고래상어', 'Whale shark', 'Rhincodon typus', 'shark', 'gray white spot', 'xl', 'ip rs car ep'],
  ['reefShark', '🦈', '화이트팁 리프상어', 'Whitetip reef shark', 'Triaenodon obesus', 'shark', 'gray white', 'l', 'ip rs ep'],
  ['blacktipReef', '🦈', '블랙팁 리프상어', 'Blacktip reef shark', 'Carcharhinus melanopterus', 'shark', 'gray black', 'l', IPR],
  ['greyReefShark', '🦈', '그레이 리프상어', 'Grey reef shark', 'Carcharhinus amblyrhynchos', 'shark', 'gray', 'l', IPR],
  ['hammerhead', '🦈', '귀상어(해머헤드)', 'Scalloped hammerhead', 'Sphyrna lewini', 'shark', 'gray', 'xl', 'ip rs car ep'],
  ['thresher', '🦈', '환도상어', 'Pelagic thresher', 'Alopias pelagicus', 'shark', 'gray', 'xl', 'ip rs'],
  ['tigerShark', '🦈', '뱀상어', 'Tiger shark', 'Galeocerdo cuvier', 'shark', 'gray stripe', 'xl', 'ip car'],
  ['greatWhite', '🦈', '백상아리', 'Great white shark', 'Carcharodon carcharias', 'shark', 'gray white', 'xl', 'cold ep med'],
  ['zebraShark', '🦈', '얼룩말상어(레오파드)', 'Zebra shark', 'Stegostoma tigrinum', 'shark', 'yellow brown spot', 'l', 'ip'],
  ['wobbegong', '🦈', '수염상어(워베공)', 'Tasselled wobbegong', 'Eucrossorhinus dasypogon', 'shark', 'brown spot', 'l', 'ip'],
  ['nurseShark', '🦈', '너스상어', 'Nurse shark', 'Ginglymostoma cirratum', 'shark', 'brown', 'l', 'car'],
  ['caribReefShark', '🦈', '카리브 리프상어', 'Caribbean reef shark', 'Carcharhinus perezii', 'shark', 'gray', 'l', 'car'],
  ['oceanicWhitetip', '🦈', '오셔닉 화이트팁', 'Oceanic whitetip', 'Carcharhinus longimanus', 'shark', 'gray white', 'xl', 'rs car'],
  ['silkyShark', '🦈', '미흑점상어(실키)', 'Silky shark', 'Carcharhinus falciformis', 'shark', 'gray', 'l', 'ip rs ep'],
  // 가오리
  ['manta', '🛸', '만타가오리(리프)', 'Reef manta ray', 'Mobula alfredi', 'ray', 'black white', 'xl', IPR],
  ['oceanicManta', '🛸', '대왕쥐가오리(오셔닉 만타)', 'Oceanic manta ray', 'Mobula birostris', 'ray', 'black white', 'xl', 'ip car ep'],
  ['eagleRay', '🪁', '점박이 이글레이', 'Spotted eagle ray', 'Aetobatus ocellatus', 'ray', 'black white spot', 'l', 'ip rs car ep'],
  ['stingray', '🪁', '가오리', 'Stingray', 'Dasyatidae', 'ray', 'brown gray', 'l', W],
  ['blueSpottedRay', '🪁', '블루스팟 가오리', 'Bluespotted ribbontail ray', 'Taeniura lymma', 'ray', 'yellow blue spot', 'm', IPR],
  ['southernStingray', '🪁', '서던 스팅레이', 'Southern stingray', 'Hypanus americanus', 'ray', 'gray brown', 'l', 'car'],
  ['mobula', '🪁', '쥐가오리(모불라)', "Munk's devil ray", 'Mobula munkiana', 'ray', 'gray', 'l', 'ep'],
  // 거북·파충류
  ['turtle', '🐢', '바다거북', 'Sea turtle', 'Cheloniidae', 'turtle', 'brown green', 'l', W],
  ['greenTurtle', '🐢', '푸른바다거북', 'Green sea turtle', 'Chelonia mydas', 'turtle', 'brown green', 'l', W],
  ['hawksbill', '🐢', '매부리바다거북', 'Hawksbill turtle', 'Eretmochelys imbricata', 'turtle', 'brown orange', 'l', 'ip rs car'],
  ['loggerhead', '🐢', '붉은바다거북', 'Loggerhead turtle', 'Caretta caretta', 'turtle', 'brown orange', 'l', 'med car nwp'],
  ['seaKrait', '🐍', '바다뱀(바다크레이트)', 'Banded sea krait', 'Laticauda colubrina', 'turtle', 'blue black stripe', 'l', 'ip'],
  ['marineIguana', '🦎', '바다이구아나', 'Marine iguana', 'Amblyrhynchus cristatus', 'turtle', 'black gray', 'l', 'ep'],
  // 포유류
  ['dolphin', '🐬', '돌고래', 'Bottlenose dolphin', 'Tursiops', 'mammal', 'gray', 'xl', W],
  ['spinnerDolphin', '🐬', '스피너 돌고래', 'Spinner dolphin', 'Stenella longirostris', 'mammal', 'gray', 'l', 'ip rs car ep'],
  ['whale', '🐋', '혹등고래', 'Humpback whale', 'Megaptera novaeangliae', 'mammal', 'black white', 'xl', 'ip car ep cold'],
  ['sealion', '🦭', '바다사자·물개', 'Sea lion / Seal', 'Otariidae', 'mammal', 'brown', 'l', 'ep cold'],
  ['dugong', '🦭', '듀공', 'Dugong', 'Dugong dugon', 'mammal', 'gray brown', 'xl', IPR],
  // 두족류
  ['octopus', '🐙', '문어', 'Day octopus', 'Octopus cyanea', 'cephalopod', 'brown red', 'm', W + ' cold'],
  ['blueRingedOctopus', '🐙', '파란고리문어', 'Blue-ringed octopus', 'Hapalochlaena', 'cephalopod', 'yellow blue', 's', 'ip nwp'],
  ['mimicOctopus', '🐙', '흉내문어(미믹)', 'Mimic octopus', 'Thaumoctopus mimicus', 'cephalopod', 'brown white stripe', 'm', 'ip'],
  ['giantPacificOctopus', '🐙', '대왕문어', 'Giant Pacific octopus', 'Enteroctopus dofleini', 'cephalopod', 'red brown', 'l', 'cold nwp'],
  ['cuttlefish', '🦑', '갑오징어', 'Broadclub cuttlefish', 'Ascarosepion latimanus', 'cephalopod', 'brown white', 'm', 'ip nwp'],
  ['flamboyantCuttlefish', '🦑', '플램보이언트 갑오징어', 'Flamboyant cuttlefish', 'Ascarosepion pfefferi', 'cephalopod', 'purple yellow', 's', 'ip'],
  ['squid', '🦑', '흰꼴뚜기(오징어)', 'Bigfin reef squid', 'Sepioteuthis lessoniana', 'cephalopod', 'white brown', 'm', 'ip nwp'],
  // 누디브랜치
  ['nudibranch', '🐌', '갯민숭달팽이(누디)', 'Nudibranch', 'Nudibranchia', 'nudibranch', 'blue yellow', 's', W + ' cold'],
  ['chromodorisAnnae', '🐌', '안나 크로모도리스', "Anna's chromodoris", 'Chromodoris annae', 'nudibranch', 'blue white black stripe', 's', 'ip'],
  ['spanishDancer', '💃', '스패니시 댄서', 'Spanish dancer', 'Hexabranchus sanguineus', 'nudibranch', 'red', 'm', IPR],
  ['phyllidia', '🐌', '필리디아', 'Varicose phyllidia', 'Phyllidia varicosa', 'nudibranch', 'black blue yellow', 's', 'ip rs'],
  ['nembrotha', '🐌', '넴브로타', 'Variable neon slug', 'Nembrotha kubaryana', 'nudibranch', 'black green orange', 's', 'ip'],
  ['flabellina', '🐌', '플라벨리나(보라)', 'Desirable flabellina', 'Coryphellina exoptata', 'nudibranch', 'purple orange', 's', 'ip'],
  ['pikachu', '🐌', '피카추 누디', 'Pikachu nudibranch', 'Thecacera pacifica', 'nudibranch', 'yellow black', 's', 'ip nwp'],
  ['hypselodorisFestiva', '🐌', '파랑갯민숭달팽이', 'Festive hypselodoris', 'Hypselodoris festiva', 'nudibranch', 'blue yellow stripe', 's', 'nwp'],
  ['chromodorisOrientalis', '🐌', '흰갯민숭달팽이', 'Oriental chromodoris', 'Chromodoris orientalis', 'nudibranch', 'white black yellow spot', 's', 'nwp'],
  // 해마·실고기
  ['seahorse', '🐴', '해마', 'Seahorse', 'Hippocampus', 'seahorse', 'yellow brown', 's', W],
  ['pygmySeahorse', '🐴', '피그미해마', 'Pygmy seahorse', 'Hippocampus bargibanti', 'seahorse', 'pink purple', 's', 'ip'],
  ['ghostPipefish', '🐟', '고스트파이프피시', 'Ornate ghost pipefish', 'Solenostomus paradoxus', 'seahorse', 'black red yellow', 's', 'ip'],
  ['trumpetfish', '🐟', '대주둥치(트럼펫피시)', 'Trumpetfish', 'Aulostomus chinensis', 'seahorse', 'yellow brown', 'm', 'ip'],
  // 곰치·장어
  ['moray', '🐍', '자이언트 곰치', 'Giant moray', 'Gymnothorax javanicus', 'eel', 'brown spot', 'l', IPR],
  ['koreanMoray', '🐍', '곰치', 'Kidako moray', 'Gymnothorax kidako', 'eel', 'brown yellow', 'l', 'nwp'],
  ['ribbonEel', '🐍', '리본장어', 'Ribbon eel', 'Rhinomuraena quaesita', 'eel', 'blue yellow', 'm', 'ip'],
  ['gardenEel', '🐍', '가든일', 'Spotted garden eel', 'Heteroconger hassi', 'eel', 'white black spot', 'm', IPR],
  ['greenMoray', '🐍', '그린 모레이', 'Green moray', 'Gymnothorax funebris', 'eel', 'green', 'l', 'car'],
  ['medMoray', '🐍', '지중해 곰치', 'Mediterranean moray', 'Muraena helena', 'eel', 'brown yellow spot', 'l', 'med'],
  // 물고기 (자주 보는 것부터)
  ['clownfish', '🐠', '흰동가리(니모)', 'Ocellaris clownfish', 'Amphiprion ocellaris', 'fish', 'orange white stripe', 's', 'ip'],
  ['clarksAnemonefish', '🐠', '흰동가리(클라키)', "Clark's anemonefish", 'Amphiprion clarkii', 'fish', 'black orange stripe', 's', 'ip nwp'],
  ['redSeaAnemonefish', '🐠', '홍해 흰동가리', 'Red Sea anemonefish', 'Amphiprion bicinctus', 'fish', 'orange white stripe', 's', 'rs'],
  ['moorishIdol', '🐠', '깃대돔', 'Moorish idol', 'Zanclus cornutus', 'fish', 'yellow black white stripe', 'm', 'ip ep'],
  ['butterflyfish', '🐠', '나비고기', 'Threadfin butterflyfish', 'Chaetodon auriga', 'fish', 'yellow white', 's', IPR],
  ['anthias', '🐠', '금강바리(안티아스)', 'Sea goldie', 'Pseudanthias squamipinnis', 'fish', 'orange pink', 's', IPR],
  ['damselfish', '🐠', '파랑자리돔', 'Blue-green chromis', 'Chromis viridis', 'fish', 'green blue', 's', IPR],
  ['jejuDamsel', '🐟', '자리돔', 'Pearl-spot chromis', 'Chromis notata', 'fish', 'brown', 's', 'nwp'],
  ['emperorAngelfish', '🐠', '황제엔젤피시', 'Emperor angelfish', 'Pomacanthus imperator', 'fish', 'blue yellow stripe', 'm', IPR],
  ['regalAngelfish', '🐠', '리걸 엔젤피시', 'Regal angelfish', 'Pygoplites diacanthus', 'fish', 'orange blue white stripe', 'm', IPR],
  ['blueTang', '🐠', '블루탱(도리)', 'Blue tang', 'Paracanthurus hepatus', 'fish', 'blue yellow black', 's', 'ip'],
  ['unicornfish', '🐟', '표문쥐치(유니콘피시)', 'Bignose unicornfish', 'Naso vlamingii', 'fish', 'blue gray', 'm', 'ip'],
  ['parrotfish', '🐠', '비늘돔(파랑비늘돔)', 'Parrotfish', 'Scarinae', 'fish', 'green blue pink', 'm', W],
  ['bumphead', '🐟', '혹등비늘돔', 'Bumphead parrotfish', 'Bolbometopon muricatum', 'fish', 'green gray', 'l', IPR],
  ['napoleon', '🐟', '나폴레옹피시', 'Humphead wrasse', 'Cheilinus undulatus', 'fish', 'green blue', 'l', IPR],
  ['titanTrigger', '🐟', '타이탄 트리거피시', 'Titan triggerfish', 'Balistoides viridescens', 'fish', 'yellow green brown', 'm', IPR],
  ['clownTrigger', '🐠', '광대쥐치(클라운 트리거)', 'Clown triggerfish', 'Balistoides conspicillum', 'fish', 'black white yellow spot', 'm', 'ip'],
  ['picassoTrigger', '🐠', '피카소 트리거피시', 'Picasso triggerfish', 'Rhinecanthus aculeatus', 'fish', 'white brown blue stripe', 's', IPR],
  ['boxfish', '🐠', '거북복(박스피시)', 'Yellow boxfish', 'Ostracion cubicum', 'fish', 'yellow black spot', 's', IPR],
  ['pufferfish', '🐡', '복어', 'Pufferfish', 'Arothron nigropunctatus', 'fish', 'gray yellow', 'm', IPR],
  ['porcupinefish', '🐡', '가시복', 'Porcupinefish', 'Diodon holocanthus', 'fish', 'brown white spot', 'm', W],
  ['lionfish', '🐟', '쏠배감펭', 'Lionfish', 'Pterois volitans', 'fish', 'red white stripe', 'm', 'ip car nwp'],
  ['scorpionfish', '🐟', '쑤기미·스콜피온피시', 'Scorpionfish', 'Scorpaenopsis oxycephala', 'fish', 'red brown', 'm', IPR],
  ['stonefish', '🪨', '스톤피시', 'Stonefish', 'Synanceia verrucosa', 'fish', 'brown gray', 'm', IPR],
  ['leafScorpionfish', '🍂', '리프 스콜피온피시', 'Leaf scorpionfish', 'Taenianotus triacanthus', 'fish', 'yellow pink white', 's', 'ip'],
  ['crocodilefish', '🐊', '크로커다일피시', 'Crocodilefish', 'Cymbacephalus beauforti', 'fish', 'gray brown', 'm', 'ip'],
  ['frogfish', '🐸', '씬벵이(프로그피시)', 'Frogfish', 'Antennariidae', 'fish', 'yellow orange black', 's', W],
  ['mandarinfish', '🐠', '만다린피시', 'Mandarinfish', 'Synchiropus splendidus', 'fish', 'blue orange green', 's', 'ip'],
  ['batfish', '🐟', '제비활치(배트피시)', 'Longfin batfish', 'Platax teira', 'fish', 'white gray black stripe', 'm', IPR],
  ['barracuda', '🐟', '바라쿠다', 'Barracuda', 'Sphyraena', 'fish', 'gray', 'l', W],
  ['jackfish', '🐟', '잭피시(빅아이 트레발리)', 'Bigeye trevally', 'Caranx sexfasciatus', 'fish', 'gray', 'l', 'ip rs ep'],
  ['giantTrevally', '🐟', '자이언트 트레발리(GT)', 'Giant trevally', 'Caranx ignobilis', 'fish', 'gray black', 'l', IPR],
  ['sardines', '🐟', '정어리 떼', 'Sardines', 'Sardinella', 'fish', 'gray blue', 's', 'ip nwp med'],
  ['snapperSchool', '🐠', '파랑줄도화돔 떼', 'Bluestripe snapper', 'Lutjanus kasmira', 'fish', 'yellow blue stripe', 'm', IPR],
  ['sweetlips', '🐠', '오리엔탈 스위트립스', 'Oriental sweetlips', 'Plectorhinchus vittatus', 'fish', 'white black yellow stripe', 'm', 'ip'],
  ['grouper', '🐟', '바리(그루퍼)', 'Grouper', 'Epinephelus', 'fish', 'brown spot', 'l', W],
  ['coralTrout', '🐟', '붉바리(코랄 트라우트)', 'Leopard coral grouper', 'Plectropomus leopardus', 'fish', 'red blue spot', 'm', 'ip'],
  ['goliathGrouper', '🐟', '골리앗 그루퍼', 'Atlantic goliath grouper', 'Epinephelus itajara', 'fish', 'brown', 'xl', 'car'],
  ['duskyGrouper', '🐟', '지중해 그루퍼', 'Dusky grouper', 'Epinephelus marginatus', 'fish', 'brown spot', 'l', 'med'],
  ['tuna', '🐟', '이빨다랑어(도그투스)', 'Dogtooth tuna', 'Gymnosarda unicolor', 'fish', 'gray', 'l', IPR],
  ['remora', '🐟', '빨판상어(레모라)', 'Remora', 'Echeneis naucrates', 'fish', 'gray black stripe', 'm', W],
  ['soldierfish', '🐟', '적투어(솔저피시)', 'Soldierfish', 'Myripristis', 'fish', 'red', 's', 'ip rs car'],
  ['banggaiCardinal', '🐠', '방가이 카디널피시', 'Banggai cardinalfish', 'Pterapogon kauderni', 'fish', 'white black spot', 's', 'ip'],
  ['goby', '🐟', '망둑어(고비)', 'Goby', 'Gobiidae', 'fish', 'white yellow', 's', W],
  ['blenny', '🐟', '청베도라치(블레니)', 'Blenny', 'Blenniidae', 'fish', 'brown yellow', 's', W],
  ['jawfish', '🐟', '후악치(조피시)', 'Jawfish', 'Opistognathus', 'fish', 'yellow brown', 's', 'ip car'],
  ['molaMola', '🐟', '개복치', 'Ocean sunfish', 'Mola mola', 'fish', 'gray', 'xl', 'ip med cold nwp'],
  ['queenAngelfish', '🐠', '퀸 엔젤피시', 'Queen angelfish', 'Holacanthus ciliaris', 'fish', 'blue yellow', 'm', 'car'],
  ['frenchAngelfish', '🐠', '프렌치 엔젤피시', 'French angelfish', 'Pomacanthus paru', 'fish', 'black yellow spot', 'm', 'car'],
  ['hogfish', '🐟', '호그피시', 'Hogfish', 'Lachnolaimus maximus', 'fish', 'white pink', 'm', 'car'],
  ['kingAngelfish', '🐠', '킹 엔젤피시', 'King angelfish', 'Holacanthus passer', 'fish', 'blue black white', 'm', 'ep'],
  ['rockfish', '🐟', '조피볼락(우럭)', 'Korean rockfish', 'Sebastes schlegelii', 'fish', 'brown gray', 'm', 'nwp'],
  ['rockBream', '🐟', '돌돔', 'Barred knifejaw', 'Oplegnathus fasciatus', 'fish', 'white black stripe', 'm', 'nwp'],
  ['filefish', '🐟', '쥐치', 'Threadsail filefish', 'Stephanolepis cirrhifer', 'fish', 'brown gray', 'm', 'nwp'],
  ['redSeaBream', '🐟', '참돔', 'Red seabream', 'Pagrus major', 'fish', 'red pink', 'm', 'nwp'],
  ['medDamsel', '🐟', '지중해 자리돔', 'Mediterranean chromis', 'Chromis chromis', 'fish', 'brown blue', 's', 'med'],
  ['wolfEel', '🐟', '울프일', 'Wolf eel', 'Anarrhichthys ocellatus', 'fish', 'gray spot', 'l', 'cold'],
  // 갑각류
  ['crab', '🦀', '게', 'Crab', 'Brachyura', 'crustacean', 'red brown', 's', W + ' cold'],
  ['porcelainCrab', '🦀', '포슬린 크랩', 'Porcelain crab', 'Neopetrolisthes maculatus', 'crustacean', 'white red spot', 's', 'ip'],
  ['lobster', '🦞', '랍스터(닭새우)', 'Painted spiny lobster', 'Panulirus versicolor', 'crustacean', 'blue green white', 'm', 'ip'],
  ['shrimp', '🦐', '새우', 'Shrimp', 'Caridea', 'crustacean', 'red white', 's', W + ' cold'],
  ['cleanerShrimp', '🦐', '클리너 새우', 'Pacific cleaner shrimp', 'Lysmata amboinensis', 'crustacean', 'red white yellow stripe', 's', IPR],
  ['harlequinShrimp', '🦐', '할리퀸 새우', 'Harlequin shrimp', 'Hymenocera picta', 'crustacean', 'white pink spot', 's', 'ip'],
  ['mantisShrimp', '🦐', '갯가재(맨티스 쉬림프)', 'Peacock mantis shrimp', 'Odontodactylus scyllarus', 'crustacean', 'green orange blue', 'm', 'ip'],
  // 무척추동물·산호
  ['softCoral', '🌸', '연산호', 'Soft coral', 'Dendronephthya', 'invert', 'pink red purple', 'm', 'ip nwp rs'],
  ['seaFan', '🪸', '부채뿔산호(씨팬)', 'Sea fan', 'Annella mollis', 'invert', 'red orange', 'l', IPR],
  ['anemone', '🌺', '말미잘', 'Magnificent sea anemone', 'Radianthus magnifica', 'invert', 'white purple green', 'm', IPR],
  ['giantClam', '🐚', '대왕조개', 'Giant clam', 'Tridacna', 'invert', 'blue green brown', 'l', IPR],
  ['blueSeaStar', '⭐', '파란불가사리', 'Blue sea star', 'Linckia laevigata', 'invert', 'blue', 'm', 'ip'],
  ['crownOfThorns', '⭐', '악마불가사리', 'Crown-of-thorns starfish', 'Acanthaster planci', 'invert', 'purple red', 'm', IPR],
  ['featherStar', '🪶', '갯고사리(페더스타)', 'Feather star', 'Crinoidea', 'invert', 'yellow black red', 's', 'ip nwp rs'],
  ['jellyfish', '🎐', '해파리', 'Jellyfish', 'Scyphozoa', 'invert', 'white pink', 'm', W + ' cold'],
  ['kelp', '🌿', '켈프 숲', 'Giant kelp', 'Macrocystis pyrifera', 'invert', 'brown green', 'xl', 'cold ep'],
  ['wreck', '⚓', '난파선', 'Wreck', '', 'other', 'brown', 'xl', W + ' cold'],
]

export const SPECIES: Species[] = ROWS.map(([key, emoji, ko, en, sci, group, colors, size, regions]) => ({
  key,
  emoji,
  ko,
  en,
  sci,
  group,
  colors: colors.split(' '),
  size,
  regions: regions.split(' ') as Region[],
}))

export const SPECIES_BY_KEY: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.key, s]))

export const GROUPS: [Group, string, string, string][] = [
  ['fish', '🐠', '물고기', 'Fish'],
  ['shark', '🦈', '상어', 'Sharks'],
  ['ray', '🛸', '가오리', 'Rays'],
  ['turtle', '🐢', '거북·파충류', 'Turtles & reptiles'],
  ['mammal', '🐬', '포유류', 'Mammals'],
  ['nudibranch', '🐌', '누디브랜치', 'Nudibranchs'],
  ['seahorse', '🐴', '해마·실고기', 'Seahorses & pipefish'],
  ['eel', '🐍', '곰치·장어', 'Eels'],
  ['cephalopod', '🐙', '문어·오징어', 'Octopus & squid'],
  ['crustacean', '🦐', '새우·게', 'Crustaceans'],
  ['invert', '🪸', '산호·기타', 'Corals & others'],
]

export const COLORS: [string, string, string, string][] = [
  ['red', '#e5484d', '빨강', 'Red'],
  ['orange', '#f76b15', '주황', 'Orange'],
  ['yellow', '#f5d90a', '노랑', 'Yellow'],
  ['green', '#30a46c', '초록', 'Green'],
  ['blue', '#0090ff', '파랑', 'Blue'],
  ['purple', '#8e4ec6', '보라', 'Purple'],
  ['pink', '#e93d82', '분홍', 'Pink'],
  ['white', '#ffffff', '흰색', 'White'],
  ['black', '#111111', '검정', 'Black'],
  ['gray', '#8b8d98', '회색', 'Gray'],
  ['brown', '#a0704a', '갈색', 'Brown'],
  ['stripe', 'repeating-linear-gradient(135deg,#333 0 3px,#fff 3px 6px)', '줄무늬', 'Stripes'],
  ['spot', 'radial-gradient(circle at 30% 30%,#333 2px,transparent 2.5px),radial-gradient(circle at 70% 65%,#333 2px,#fff 2.5px)', '점무늬', 'Spots'],
]

export const SIZES: [Size, string, string][] = [
  ['s', '작음 (~10cm)', 'Small (<10cm)'],
  ['m', '중간 (10~50cm)', 'Medium'],
  ['l', '큼 (0.5~2m)', 'Large'],
  ['xl', '아주 큼 (2m~)', 'Huge (2m+)'],
]

/** 좌표로 대략적인 바다 구분 */
export function regionOf(lat: number, lon: number): Region {
  if (lon >= 32 && lon <= 44 && lat >= 11 && lat <= 30.5) return 'rs'
  if (lat > 30 && lat < 47 && lon >= -32 && lon <= 37) return 'med'
  if (Math.abs(lat) > 40) return lon > 120 && lon < 150 && lat < 46 ? 'nwp' : 'cold'
  if (lat > 30 && lon > 120 && lon < 150) return 'nwp'
  if (lon < -100 || (lon < -77 && lon > -125 && lat < 11)) return lat > 32 ? 'cold' : lon < -125 ? 'ip' : 'ep'
  if (lon < -30) return 'car'
  if (lat < -33) return 'cold'
  return 'ip'
}
