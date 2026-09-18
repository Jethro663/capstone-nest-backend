CREATE OR REPLACE FUNCTION public.sync_app_version_artifact_aliases() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE legacy_insert boolean;
BEGIN
  legacy_insert := TG_OP = 'INSERT'
    AND NEW.artifact_download_url IS NULL
    AND NEW.apk_download_url IS NOT NULL;

  IF legacy_insert THEN
    NEW.artifact_kind := CASE WHEN NEW.platform = 'ios' THEN 'ipa' ELSE 'apk' END;
    NEW.distribution_channel := CASE WHEN NEW.platform = 'ios' THEN 'sidestore' ELSE 'website' END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.apk_download_url IS DISTINCT FROM OLD.apk_download_url
      AND NEW.artifact_download_url IS NOT DISTINCT FROM OLD.artifact_download_url THEN
      NEW.artifact_download_url := NEW.apk_download_url;
    ELSIF NEW.artifact_download_url IS DISTINCT FROM OLD.artifact_download_url
      AND NEW.apk_download_url IS NOT DISTINCT FROM OLD.apk_download_url THEN
      NEW.apk_download_url := NEW.artifact_download_url;
    END IF;

    IF NEW.apk_sha256 IS DISTINCT FROM OLD.apk_sha256
      AND NEW.artifact_sha256 IS NOT DISTINCT FROM OLD.artifact_sha256 THEN
      NEW.artifact_sha256 := NEW.apk_sha256;
    ELSIF NEW.artifact_sha256 IS DISTINCT FROM OLD.artifact_sha256
      AND NEW.apk_sha256 IS NOT DISTINCT FROM OLD.apk_sha256 THEN
      NEW.apk_sha256 := NEW.artifact_sha256;
    END IF;

    IF NEW.apk_size_bytes IS DISTINCT FROM OLD.apk_size_bytes
      AND NEW.artifact_size_bytes IS NOT DISTINCT FROM OLD.artifact_size_bytes THEN
      NEW.artifact_size_bytes := NEW.apk_size_bytes;
    ELSIF NEW.artifact_size_bytes IS DISTINCT FROM OLD.artifact_size_bytes
      AND NEW.apk_size_bytes IS NOT DISTINCT FROM OLD.apk_size_bytes THEN
      NEW.apk_size_bytes := NEW.artifact_size_bytes;
    END IF;
  END IF;

  NEW.artifact_download_url := COALESCE(NEW.artifact_download_url, NEW.apk_download_url);
  NEW.apk_download_url := COALESCE(NEW.apk_download_url, NEW.artifact_download_url);
  NEW.artifact_sha256 := COALESCE(NEW.artifact_sha256, NEW.apk_sha256);
  NEW.apk_sha256 := COALESCE(NEW.apk_sha256, NEW.artifact_sha256);
  NEW.artifact_size_bytes := COALESCE(NEW.artifact_size_bytes, NEW.apk_size_bytes);
  NEW.apk_size_bytes := COALESCE(NEW.apk_size_bytes, NEW.artifact_size_bytes);
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS app_versions_artifact_aliases ON public.app_versions;--> statement-breakpoint
CREATE TRIGGER app_versions_artifact_aliases
BEFORE INSERT OR UPDATE ON public.app_versions
FOR EACH ROW EXECUTE FUNCTION public.sync_app_version_artifact_aliases();--> statement-breakpoint
DROP TRIGGER IF EXISTS nexora_reset_write_barrier ON public.notification_devices;--> statement-breakpoint
CREATE TRIGGER nexora_reset_write_barrier
BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.notification_devices
FOR EACH STATEMENT EXECUTE FUNCTION public.nexora_reset_write_barrier();
