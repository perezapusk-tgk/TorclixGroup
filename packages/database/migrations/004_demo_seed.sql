create extension if not exists pgcrypto;

insert into organizations(id,name,slug,plan)
values ('00000000-0000-4000-8000-000000000001','Torclix Demo','torclix-demo','pro')
on conflict (id) do nothing;

insert into users(id,external_id,email,name)
values ('00000000-0000-4000-8000-000000000002','demo','demo@torclix.local','Studio Owner')
on conflict (id) do nothing;

insert into memberships(organization_id,user_id,role)
values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','owner')
on conflict (organization_id,user_id) do update set role='owner';

insert into projects(id,organization_id,name,type,industry,status,slug)
values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Maison Noire','website_mini_app','restaurant','active','maison-noire'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','Forma Fitness','mini_app','fitness','active','forma-fitness')
on conflict (id) do nothing;

insert into site_documents(project_id,document,published_document)
values
 ('00000000-0000-4000-8000-000000000101',
  '{"projectId":"00000000-0000-4000-8000-000000000101","activePage":"home","accent":"#d8ff3e","pages":[{"id":"home","name":"Home","blocks":[{"id":"b1","type":"Hero","title":"Maison Noire","body":"A premium restaurant experience, managed from one studio."},{"id":"b2","type":"Features","title":"Menu, booking and loyalty.","body":"Everything your guests need in one digital experience."},{"id":"b3","type":"CTA","title":"Reserve your table.","body":"Book a consultation or start a reservation."}]}]}',
  '{"projectId":"00000000-0000-4000-8000-000000000101","activePage":"home","accent":"#d8ff3e","pages":[{"id":"home","name":"Home","blocks":[{"id":"b1","type":"Hero","title":"Maison Noire","body":"A premium restaurant experience, managed from one studio."},{"id":"b2","type":"Features","title":"Menu, booking and loyalty.","body":"Everything your guests need in one digital experience."},{"id":"b3","type":"CTA","title":"Reserve your table.","body":"Book a consultation or start a reservation."}]}]}')
on conflict (project_id) do nothing;

insert into site_documents(project_id,document,published_document)
values
 ('00000000-0000-4000-8000-000000000102',
  '{"projectId":"00000000-0000-4000-8000-000000000102","activePage":"home","accent":"#d8ff3e","pages":[{"id":"home","name":"Home","blocks":[{"id":"b1","type":"Hero","title":"Forma Fitness","body":"Classes, trainers and memberships in one Mini App."}]}]}',
  '{"projectId":"00000000-0000-4000-8000-000000000102","activePage":"home","accent":"#d8ff3e","pages":[{"id":"home","name":"Home","blocks":[{"id":"b1","type":"Hero","title":"Forma Fitness","body":"Classes, trainers and memberships in one Mini App."}]}]}')
on conflict (project_id) do nothing;
