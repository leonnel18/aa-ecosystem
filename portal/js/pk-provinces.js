// Pakistani provinces/territories → districts map
// Source: Pakistan Bureau of Statistics
"use strict";

const PK_PROVINCES = {
  "Punjab": ["Lahore","Faisalabad","Rawalpindi","Gujranwala","Multan","Bahawalpur","Sargodha","Sialkot","Sheikhupura","Gujrat","Jhang","Rahim Yar Khan","Kasur","Dera Ghazi Khan","Attock","Bahawalnagar","Chakwal","Chiniot","Hafizabad","Khanewal","Khushab","Layyah","Lodhran","Mandi Bahauddin","Mianwali","Muzaffargarh","Narowal","Nankana Sahib","Okara","Pakpattan","Sahiwal","Toba Tek Singh","Vehari"],
  "Sindh": ["Karachi","Hyderabad","Sukkur","Larkana","Mirpurkhas","Nawabshah","Thatta","Badin","Dadu","Ghotki","Jacobabad","Jamshoro","Kashmore","Khairpur","Korangi","Matiari","Naushahro Feroze","Qambar Shahdadkot","Sanghar","Shaheed Benazirabad","Shikarpur","Sujawal","Tando Allahyar","Tando Muhammad Khan","Tharparkar","Umerkot"],
  "Khyber Pakhtunkhwa": ["Peshawar","Abbottabad","Mardan","Mansehra","Kohat","Swat","Bannu","Charsadda","Chitral","Dera Ismail Khan","Dir (Lower)","Dir (Upper)","Hangu","Haripur","Karak","Lakki Marwat","Malakand","Nowshera","Shangla","Swabi","Tank","Battagram","Buner","Kohistan (Lower)","Kohistan (Upper)","Kolai-Pallas Kohistan","Kurram","Mohmand","North Waziristan","Orakzai","South Waziristan (Lower)","South Waziristan (Upper)","Torghar"],
  "Balochistan": ["Quetta","Gwadar","Turbat","Khuzdar","Chaman","Hub","Sibi","Loralai","Zhob","Dera Bugti","Kharan","Lasbela","Mastung","Musakhel","Nasirabad","Nushki","Panjgur","Pishin","Qilla Abdullah","Qilla Saifullah","Sherani","Washuk","Awaran","Barkhan","Chagai","Harnai","Jaffarabad","Jhal Magsi","Kalat","Kech","Kohlu","Killa Abdullah","Lehri"],
  "Islamabad Capital Territory": ["Islamabad"],
  "Gilgit-Baltistan": ["Gilgit","Skardu","Astore","Chilas (Diamer)","Ghanche","Ghizer","Gupis-Yasin","Hunza","Kharmang","Nagar","Roundu","Shigar"],
  "Azad Kashmir": ["Muzaffarabad","Mirpur","Rawalakot","Bagh","Bhimber","Hattian Bala","Haveli","Jhelum Valley","Kotli","Neelum","Sudhnoti"],
  "FATA (Merged Districts)": ["Bajaur","Khyber","Kurram","Mohmand","North Waziristan","Orakzai","South Waziristan"],
};
