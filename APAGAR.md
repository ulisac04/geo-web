# APAGAR — pausar / prender la EC2

Stop/start de **la misma** instancia. Conserva disco, `/opt/geo` y Postgres.

App: https://tu-ruta.app  
CDN: https://d30avfmnljmwk2.cloudfront.net  
Instancia: `i-017fe3e2cfcc3bd96` · EIP `184.192.214.17` · `us-east-1`

**No** `terraform apply` si el plan dice `aws_instance.geo must be replaced`. **No** `terraform destroy`.

---

## Usuarios

| | Email | Clave |
|---|---|---|
| Demo (SPA) | `operador@andina.logistic` | `demo1234` |
| Admin (`/admin`) | `terraform output -raw platform_admin_email` | `terraform output -raw platform_admin_password` |

```bash
cd ~/geo/deploy/terraform
terraform output -raw platform_admin_email
terraform output -raw platform_admin_password
```

---

## Apagar

```bash
aws ec2 stop-instances --region us-east-1 --instance-ids i-017fe3e2cfcc3bd96
aws ec2 wait instance-stopped --region us-east-1 --instance-ids i-017fe3e2cfcc3bd96
```

Siguen cobrando EBS, S3, CloudFront y a menudo la EIP.

---

## Prender

```bash
aws ec2 start-instances --region us-east-1 --instance-ids i-017fe3e2cfcc3bd96
aws ec2 wait instance-running --region us-east-1 --instance-ids i-017fe3e2cfcc3bd96
ssh -i ~/.ssh/id_ed25519 ubuntu@184.192.214.17
```

Compose no arranca solo. En la EC2:

```bash
cd /opt/geo
set -a && source /etc/geo/app.env && set +a
set -a && source /etc/geo/compose.env && set +a
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.aws.yml up -d
sudo systemctl restart geo-api
curl -sS http://127.0.0.1:8080/health | jq .
```

Fedora: `curl -sS https://tu-ruta.app/health | jq .`

Si SSH se queja de host key (solo si **reemplazaste** la caja): `ssh-keygen -R 184.192.214.17`. Disco nuevo = no hay `/opt/geo`; hay que clonar y `cargo build` otra vez.

---

## Parser (Groq + OpenAI) y push FCM

Userdata **solo corre el primer boot**. Esta caja ya existe: hay que editar `/etc/geo/app.env` a mano. Un `terraform apply` **no** actualiza ese archivo (y **no** debe reemplazar la instancia).

Tras `start-instances` y compose (arriba), en la EC2 (no pegues las keys en el chat):

```bash
sudo grep -E '^(GROQ|OPENAI|GEMINI)_API_KEY=|^GOOGLE_APPLICATION_CREDENTIALS=' /etc/geo/app.env || true
sudo nano /etc/geo/app.env
```

Completa (sin comillas):

```
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=/etc/geo/firebase-adminsdk.json
```

La cuenta de servicio de Firebase (`taxirubio`) va en `/etc/geo/firebase-adminsdk.json` (`chmod 640`, `chown root:ubuntu`). Evita `FIREBASE_SERVICE_ACCOUNT_JSON` en una sola línea.

```bash
sudo systemctl restart geo-api
sudo systemctl status geo-api --no-pager
```

Parser: 503 si faltan Groq/OpenAI (Gemini es backup). FCM: sin el JSON, asignar sigue; no hay push.

