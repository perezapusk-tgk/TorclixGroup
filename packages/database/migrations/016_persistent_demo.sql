-- Persistent public demo projects. These are intentionally isolated from real studio tenants.
create table if not exists torclix_demo_seed_marker (
  id text primary key,
  created_at timestamptz not null default now()
);

insert into organizations(id,name,slug,plan)
values ('00000000-0000-4000-8000-000000000001','TorclixGroup Demo','torclix-demo','pro')
on conflict (id) do update set name=excluded.name, slug=excluded.slug, plan=excluded.plan;

insert into projects(id,organization_id,name,type,industry,status,slug)
values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Maison Noire','website_mini_app','restaurant','active','maison-noire'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','Forma Fitness','mini_app','fitness','active','forma-fitness')
on conflict (id) do update set name=excluded.name,type=excluded.type,industry=excluded.industry,status=excluded.status,slug=excluded.slug;

insert into site_documents(project_id,version,document,published_document,published_version)
values
 ('00000000-0000-4000-8000-000000000101',1,
  '{"projectId":"00000000-0000-4000-8000-000000000101","activePage":"home","accent":"#d8ff3e","miniApp":{"modules":["home","catalog","cart","booking","profile","loyalty","notifications"],"navigation":["home","catalog","cart","booking","profile","loyalty","notifications"],"theme":{"accent":"#d8ff3e","mode":"dark"}},"pages":[{"id":"home","name":"Главная","blocks":[{"id":"hero","type":"Hero","title":"Вкус, который возвращает.","body":"Меню, столики и заказ — в одном цифровом опыте."},{"id":"features","type":"Features","title":"Всё для гостя.","body":"Меню, бронирование, заказы и программа лояльности."},{"id":"booking","type":"Booking","title":"Забронировать столик","body":"Выберите дату и время — без звонков."},{"id":"cta","type":"CTA","title":"До встречи за столом.","body":"Откройте Mini App и оформите заказ."}]}]}',
  '{"projectId":"00000000-0000-4000-8000-000000000101","activePage":"home","accent":"#d8ff3e","miniApp":{"modules":["home","catalog","cart","booking","profile","loyalty","notifications"],"navigation":["home","catalog","cart","booking","profile","loyalty","notifications"],"theme":{"accent":"#d8ff3e","mode":"dark"}},"pages":[{"id":"home","name":"Главная","blocks":[{"id":"hero","type":"Hero","title":"Вкус, который возвращает.","body":"Меню, столики и заказ — в одном цифровом опыте."},{"id":"features","type":"Features","title":"Всё для гостя.","body":"Меню, бронирование, заказы и программа лояльности."},{"id":"booking","type":"Booking","title":"Забронировать столик","body":"Выберите дату и время — без звонков."},{"id":"cta","type":"CTA","title":"До встречи за столом.","body":"Откройте Mini App и оформите заказ."}]}]}',1)
on conflict (project_id) do update set version=excluded.version,document=excluded.document,published_document=excluded.published_document,published_version=excluded.published_version,updated_at=now();

insert into site_documents(project_id,version,document,published_document,published_version)
values
 ('00000000-0000-4000-8000-000000000102',1,
  '{"projectId":"00000000-0000-4000-8000-000000000102","activePage":"home","accent":"#5aa9ff","miniApp":{"modules":["home","catalog","booking","calendar","membership","profile","notifications"],"navigation":["home","catalog","booking","calendar","membership","profile","notifications"],"theme":{"accent":"#5aa9ff","mode":"dark"}},"pages":[{"id":"home","name":"Главная","blocks":[{"id":"hero","type":"Hero","title":"Тренировки, которые работают.","body":"Расписание, тренеры и абонементы в одном месте."},{"id":"features","type":"Features","title":"Выберите свой ритм.","body":"Групповые занятия, персональные тренировки и абонементы."},{"id":"booking","type":"Booking","title":"Записаться на тренировку","body":"Выберите занятие и время."}]}]}',
  '{"projectId":"00000000-0000-4000-8000-000000000102","activePage":"home","accent":"#5aa9ff","miniApp":{"modules":["home","catalog","booking","calendar","membership","profile","notifications"],"navigation":["home","catalog","booking","calendar","membership","profile","notifications"],"theme":{"accent":"#5aa9ff","mode":"dark"}},"pages":[{"id":"home","name":"Главная","blocks":[{"id":"hero","type":"Hero","title":"Тренировки, которые работают.","body":"Расписание, тренеры и абонементы в одном месте."},{"id":"features","type":"Features","title":"Выберите свой ритм.","body":"Групповые занятия, персональные тренировки и абонементы."},{"id":"booking","type":"Booking","title":"Записаться на тренировку","body":"Выберите занятие и время."}]}]}',1)
on conflict (project_id) do update set version=excluded.version,document=excluded.document,published_document=excluded.published_document,published_version=excluded.published_version,updated_at=now();

insert into catalog_items(id,organization_id,project_id,name,slug,item_type,description,price,currency,status,stock)
values
 ('00000000-0000-4000-8000-000000001101','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Авторский завтрак','signature-breakfast','service','Яйцо, авокадо, тост и кофе',14.90,'EUR','active',null),
 ('00000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Паста трюфель','truffle-pasta','product','Домашняя паста с пармезаном',19.50,'EUR','active',null),
 ('00000000-0000-4000-8000-000000001103','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Дегустационный сет','tasting-set','product','Выбор шефа на двоих',32.00,'EUR','active',null),
 ('00000000-0000-4000-8000-000000001201','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','Пробная тренировка','trial-workout','service','Знакомство с тренером — 45 минут',0.00,'EUR','active',null),
 ('00000000-0000-4000-8000-000000001202','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','Персональная тренировка','personal-workout','service','Индивидуальная программа',35.00,'EUR','active',null),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','Месячный абонемент','monthly-membership','service','Безлимитный доступ к залу',79.00,'EUR','active',null)
on conflict (id) do update set name=excluded.name,description=excluded.description,price=excluded.price,status=excluded.status,stock=excluded.stock;

insert into torclix_demo_seed_marker(id) values ('v1') on conflict (id) do nothing;
