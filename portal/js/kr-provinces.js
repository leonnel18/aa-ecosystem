// South Korean administrative divisions → districts/cities map
// Source: Ministry of the Interior and Safety (MOIS), 17 administrative divisions
"use strict";

const KR_PROVINCES = {
  "Seoul (서울특별시)": ["Gangnam-gu","Gangdong-gu","Gangbuk-gu","Gangseo-gu","Gwanak-gu","Gwangjin-gu","Guro-gu","Geumcheon-gu","Nowon-gu","Dobong-gu","Dongdaemun-gu","Dongjak-gu","Mapo-gu","Seodaemun-gu","Seocho-gu","Seongdong-gu","Seongbuk-gu","Songpa-gu","Yangcheon-gu","Yeongdeungpo-gu","Yongsan-gu","Eunpyeong-gu","Jongno-gu","Jung-gu","Jungnang-gu"],
  "Busan (부산광역시)": ["Gijang-gun","Nam-gu","Dong-gu","Dongrae-gu","Buk-gu","Busanjin-gu","Saha-gu","Sasang-gu","Seo-gu","Sujeong-gu","Yeonje-gu","Yeongdo-gu","Jung-gu","Haeundae-gu","Gangseo-gu"],
  "Daegu (대구광역시)": ["Nam-gu","Dalseo-gu","Dalseong-gun","Dong-gu","Buk-gu","Seo-gu","Suseong-gu","Jung-gu","Gunwi-gun"],
  "Incheon (인천광역시)": ["Ganghwa-gun","Gyeyang-gu","Namdong-gu","Dong-gu","Bupyeong-gu","Seo-gu","Yeonsu-gu","Ongjin-gun","Jung-gu","Michuhol-gu"],
  "Gwangju (광주광역시)": ["Gwangsan-gu","Nam-gu","Dong-gu","Buk-gu","Seo-gu"],
  "Daejeon (대전광역시)": ["Daedeok-gu","Dong-gu","Seo-gu","Yuseong-gu","Jung-gu"],
  "Ulsan (울산광역시)": ["Nam-gu","Dong-gu","Buk-gu","Ulju-gun","Jung-gu"],
  "Sejong (세종특별자치시)": ["Sejong"],
  "Gyeonggi-do (경기도)": ["Gapyeong-gun","Goyang-si","Gwacheon-si","Gwangju-si","Gwangmyeong-si","Guri-si","Gunpo-si","Gimpo-si","Namyangju-si","Dongducheon-si","Bucheon-si","Seongnam-si","Suwon-si","Siheung-si","Ansan-si","Anseong-si","Anyang-si","Yangju-si","Yangpyeong-gun","Yeoju-si","Yongin-si","Osan-si","Uiwang-si","Uijeongbu-si","Icheon-si","Paju-si","Pyeongtaek-si","Pocheon-si","Hanam-si","Hwaseong-si","Yeoncheon-gun","Yangju-si"],
  "Gangwon-do (강원도)": ["Gangneung-si","Goseong-gun","Donghae-si","Samcheok-si","Sokcho-si","양양-gun","Wonju-si","Inje-gun","Jeongseon-gun","Cheorwon-gun","Chuncheon-si","Taebaek-si","Pyeongchang-gun","Hoengseong-gun","Hwacheon-gun","Yanggu-gun","Yeongwol-gun","Hongcheon-gun"],
  "Chungcheongbuk-do (충청북도)": ["Goesan-gun","Danyang-gun","Boeun-gun","Yeongdong-gun","Okcheon-gun","Cheongju-si","Chungju-si","Eumseong-gun","Jeungpyeong-gun","Jincheon-gun"],
  "Chungcheongnam-do (충청남도)": ["Gyeryong-si","Gongju-si","Geumsan-gun","Nonsan-si","Dangjin-si","Boryeong-si","Buyeo-gun","Seosan-si","Seocheon-gun","Asan-si","Yesan-gun","Cheonan-si","Cheongyang-gun","Taean-gun","Hongseong-gun"],
  "Jeollabuk-do (전라북도)": ["Gochang-gun","Gunsan-si","Gimje-si","Namwon-si","Muju-gun","Buan-gun","Sunchang-gun","Iksan-si","Imsil-gun","Jangsu-gun","Jeonju-si","Jeongeup-si","Jinan-gun","Wanju-gun"],
  "Jeollanam-do (전라남도)": ["Gangjin-gun","Goheung-gun","Gokseong-gun","Gwangyang-si","Gurye-gun","Naju-si","Damyang-gun","Mokpo-si","Muan-gun","Boseong-gun","Suncheon-si","Sinan-gun","Yeosu-si","Yeongam-gun","Yeongwang-gun","Wando-gun","Jangheung-gun","Jangseong-gun","Jindo-gun","Hampyeong-gun","Haenam-gun","Hwasun-gun"],
  "Gyeongsangbuk-do (경상북도)": ["Gyeongju-si","Gyeongsan-si","Goryeong-gun","Gumi-si","Gunwi-gun","Gimcheon-si","Mungyeong-si","Bonghwa-gun","Sangju-si","Seongju-gun","Andong-si","Yeongcheon-si","Yeongdeok-gun","Yeongju-si","Yeongyang-gun","Uljin-gun","Ulleung-gun","Uiseong-gun","Cheongdo-gun","Cheongsong-gun","Chilgok-gun","Pohang-si"],
  "Gyeongsangnam-do (경상남도)": ["Geoje-si","Geochang-gun","Gimhae-si","Namhae-gun","Miryang-si","Sacheon-si","Sancheong-gun","Yangsan-si","Uiryeong-gun","Jinju-si","Changwon-si","Changnyeong-gun","Tongyeong-si","Hadong-gun","Haman-gun","Hamyang-gun","Hapcheon-gun"],
  "Jeju Special Autonomous Province (제주특별자치도)": ["Jeju-si","Seogwipo-si"],
};
