# Hal Takip

## Supabase Backup ve Restore

Bu repo, GitHub Actions ile her gün Türkiye saatiyle 07:00'de Supabase PostgreSQL yedeği alıp Google Drive'a yükleyecek şekilde ayarlanmıştır.

Workflow dosyası: `.github/workflows/supabase-backup.yml`

### Çalışma Şekli

- Zamanlama: Her gün 07:00 Turkey time
- GitHub cron karşılığı: `0 4 * * *`
- Manuel çalıştırma: GitHub Actions ekranından `Supabase Daily Backup` workflow'u için `Run workflow`
- Backup formatı: plain `.sql`
- Dosya adı formatı: `haldb_YYYY-MM-DD_HH-MM.sql`
- Google Drive klasörü: `HalTakipBackups/YYYY-MM-DD/`
- GitHub Actions artifact saklama süresi: 30 gün

### Gerekli GitHub Secrets

Repository ayarlarında `Settings > Secrets and variables > Actions > New repository secret` alanından şu secret'lar eklenmelidir:

| Secret | Açıklama |
| --- | --- |
| `SUPABASE_DB_URL` | Supabase PostgreSQL connection string |
| `RCLONE_CONFIG` | `gdrive` remote'unu içeren rclone config içeriği |

### SUPABASE_DB_URL Secret

Supabase dashboard'da proje ayarlarından PostgreSQL connection string alınır ve `SUPABASE_DB_URL` secret'ı olarak eklenir.

Örnek format:

```txt
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

Parola veya bağlantı bilgisi repoya yazılmamalıdır. Connection string sadece GitHub Secret olarak saklanmalıdır.

### Google Drive rclone Config Alma

Google Drive yedekleri `esertarim5@gmail.com` hesabına kaydedilecek şekilde rclone OAuth ile yetkilendirilmelidir. Google hesap şifresi kullanılmaz ve repoya yazılmaz.

Yerel bilgisayarda rclone kurulu değilse önce kurun:

```bash
brew install rclone
```

rclone config oluşturun:

```bash
rclone config
```

Kurulum sırasında:

- Yeni remote oluşturun.
- Remote adını `gdrive` yapın.
- Storage olarak Google Drive seçin.
- OAuth adımında `esertarim5@gmail.com` hesabıyla giriş yapın.
- rclone tarafından oluşturulan token'ı onaylayın.

Oluşan config içeriğini görüntüleyin:

```bash
cat ~/.config/rclone/rclone.conf
```

İçerikte remote başlığı `[gdrive]` olmalıdır. Bu dosyanın tüm içeriğini GitHub'da `RCLONE_CONFIG` secret'ı olarak ekleyin.

Eğer remote adı `gdrive` dışında bir adla oluşturulursa workflow içindeki `gdrive:` hedefleri aynı remote adıyla güncellenmelidir. Varsayılan ve önerilen remote adı `gdrive`'dır.

### Backup Nerede Görülür?

Başarılı bir çalıştırmadan sonra backup iki yerde görülür:

- Google Drive: `HalTakipBackups/YYYY-MM-DD/haldb_YYYY-MM-DD_HH-MM.sql`
- GitHub Actions run artifact: workflow çalışmasının `Artifacts` bölümünde, 30 gün boyunca

Workflow sonunda Google Drive upload doğrulaması için şu komut çalışır:

```bash
rclone lsf gdrive:HalTakipBackups/$(date +'%Y-%m-%d')/
```

### Restore

Bir `.sql` backup dosyasını geri yüklemek için:

```bash
psql "SUPABASE_DB_URL" < haldb_YYYY-MM-DD_HH-MM.sql
```

Gerçek kullanımda `SUPABASE_DB_URL` yerine Supabase PostgreSQL connection string verilmelidir. Restore işlemi canlı veritabanını etkileyebileceği için önce hedef ortam ve dosya kontrol edilmelidir.

### Güvenlik Notları

- Google şifresi kullanılmaz.
- rclone token repoya yazılmaz.
- DB şifresi repoya yazılmaz.
- Tüm credential'lar GitHub Secrets içinde saklanır.
- Workflow sadece backup alır, Google Drive'a yükler ve artifact oluşturur; production kodunu etkilemez.
