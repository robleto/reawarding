-- Views to inspect pg_cron jobs and latest run status
create schema if not exists admin;

create or replace view admin.cron_jobs as
select jobid, jobname, schedule, command, active, nodename, nodeport
from cron.job;

create or replace view admin.cron_runs_latest as
select j.jobid,
       r.status,
       r.run_started,
       r.run_duration,
       r.return_message
from cron.job j
left join lateral (
  select d.*
  from cron.job_run_details d
  where d.jobid = j.jobid
  order by d.run_started desc
  limit 1
) r on true;

create or replace view admin.cron_status as
select j.jobid,
       j.jobname,
       j.schedule,
       j.active,
       j.command,
       rl.status,
       rl.run_started,
       rl.run_duration,
       rl.return_message
from admin.cron_jobs j
left join admin.cron_runs_latest rl using (jobid);
