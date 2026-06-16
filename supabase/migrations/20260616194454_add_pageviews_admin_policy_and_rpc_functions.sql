
-- Admin SELECT policy
CREATE POLICY "admin_select_page_views_anonymous" ON page_views_anonymous
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()));

-- Daily views for a specific path
CREATE OR REPLACE FUNCTION get_pageviews_daily(p_path text, p_days int DEFAULT 90)
RETURNS TABLE(day date, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT date_trunc('day', occurred_at)::date AS day,
         count(*) AS views
  FROM page_views_anonymous
  WHERE page_path = p_path
    AND occurred_at >= now() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
$$;

-- Device mix for a specific path (last 30 days)
CREATE OR REPLACE FUNCTION get_pageviews_by_device(p_path text)
RETURNS TABLE(device_class text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT coalesce(device_class, 'onbekend') AS device_class,
         count(*) AS views
  FROM page_views_anonymous
  WHERE page_path = p_path
    AND occurred_at >= now() - interval '30 days'
  GROUP BY 1
  ORDER BY views DESC;
$$;

-- Top referrers across all paths (configurable days)
CREATE OR REPLACE FUNCTION get_pageviews_top_referrers(p_days int DEFAULT 30, p_path text DEFAULT NULL)
RETURNS TABLE(referrer_host text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT referrer_host,
         count(*) AS views
  FROM page_views_anonymous
  WHERE occurred_at >= now() - (p_days || ' days')::interval
    AND referrer_host IS NOT NULL
    AND (p_path IS NULL OR page_path = p_path)
  GROUP BY 1
  ORDER BY views DESC
  LIMIT 15;
$$;

-- Top paths by view count
CREATE OR REPLACE FUNCTION get_pageviews_top_paths(p_days int DEFAULT 30)
RETURNS TABLE(page_path text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT page_path,
         count(*) AS views
  FROM page_views_anonymous
  WHERE occurred_at >= now() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY views DESC
  LIMIT 30;
$$;

-- Overall summary stats
CREATE OR REPLACE FUNCTION get_pageviews_summary(p_days int DEFAULT 30)
RETURNS TABLE(
  total_views bigint,
  unique_paths bigint,
  unique_referrers bigint,
  views_today bigint,
  views_yesterday bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    count(*) AS total_views,
    count(DISTINCT page_path) AS unique_paths,
    count(DISTINCT referrer_host) AS unique_referrers,
    count(*) FILTER (WHERE occurred_at >= current_date) AS views_today,
    count(*) FILTER (WHERE occurred_at >= current_date - 1 AND occurred_at < current_date) AS views_yesterday
  FROM page_views_anonymous
  WHERE occurred_at >= now() - (p_days || ' days')::interval;
$$;
