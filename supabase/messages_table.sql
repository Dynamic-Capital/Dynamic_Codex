create table messages (
  id serial primary key,
  user_id bigint,
  username text,
  text text,
  date timestamptz
);