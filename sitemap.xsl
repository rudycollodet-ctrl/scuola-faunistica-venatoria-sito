<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  exclude-result-prefixes="s image">

<xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

<xsl:template name="data">
  <xsl:param name="d"/>
  <xsl:value-of select="concat(substring($d,9,2),'/',substring($d,6,2),'/',substring($d,1,4))"/>
</xsl:template>

<xsl:template match="/">
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, follow"/>
<title>Mappa del sito – Scuola Faunistica Venatoria</title>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,500;9..144,0,600;9..144,1,400&amp;family=Work+Sans:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet"/>
<style>
  :root{
    --verde:#16290D;--verde2:#1F3814;--muschio:#4C7A2E;
    --oro:#D9B65C;--oro2:#B99646;
    --carta:#F3EFE4;--carta2:#EAE3D2;--terra:#241E14;--grigio:#7a7261;--linea:#cfc6b0;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--carta);color:var(--terra);font-family:'Work Sans',system-ui,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .serif{font-family:'Fraunces',Georgia,serif}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}

  /* HERO */
  header{position:relative;color:var(--carta);overflow:hidden;background:var(--verde)}
  header .foto{position:absolute;inset:0;background:url('/camosci-hero.webp') center 40%/cover;opacity:.32;filter:saturate(.8)}
  header .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,41,13,.35) 0%,rgba(22,41,13,.92) 85%,var(--verde) 100%)}
  header .in{position:relative;max-width:1080px;margin:0 auto;padding:56px 24px 64px}
  .marchio{display:flex;align-items:center;gap:14px;text-decoration:none;margin-bottom:56px}
  .marchio img{width:52px;height:52px;border-radius:50%;border:2px solid var(--oro)}
  .marchio span{font-family:'Fraunces',serif;font-size:18px;font-weight:600;letter-spacing:.01em}
  .occhiello{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--oro)}
  h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(40px,7vw,76px);line-height:1;margin:14px 0 18px;letter-spacing:-.01em}
  h1 em{font-style:italic;font-weight:400;color:var(--oro)}
  .lead{max-width:600px;font-size:17px;color:#d6d9c9;margin:0}
  .numeri{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px}
  .num{border:1px solid rgba(217,182,92,.4);border-radius:4px;padding:12px 18px;min-width:140px;background:rgba(22,41,13,.5)}
  .num b{display:block;font-family:'Fraunces',serif;font-size:30px;font-weight:600;color:var(--oro);line-height:1.1}
  .num small{font-size:12px;color:#c7c9b8;letter-spacing:.04em}

  main{max-width:1080px;margin:0 auto;padding:56px 24px 24px}
  h2{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(26px,3.4vw,36px);line-height:1.1;margin:0 0 6px}
  .sotto{color:var(--grigio);margin:0 0 28px}
  section{margin-bottom:64px}

  /* PAGINE */
  .pagina{background:#fff;border:1px solid var(--linea);border-radius:6px;overflow:hidden;margin-bottom:18px;box-shadow:0 1px 0 rgba(36,30,20,.04)}
  .pagina .testa{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px;border-bottom:1px solid var(--carta2)}
  .pagina h3{font-family:'Fraunces',serif;font-size:24px;font-weight:600;margin:0 0 2px}
  .pagina .url{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--muschio);text-decoration:none;word-break:break-all}
  .pagina .url:hover{text-decoration:underline}
  .meta{display:flex;gap:8px;flex-wrap:wrap}
  .tag{font-family:'JetBrains Mono',monospace;font-size:11.5px;padding:5px 10px;border-radius:999px;background:var(--carta);border:1px solid var(--linea);color:var(--terra);white-space:nowrap}
  .tag.oro{background:var(--oro);border-color:var(--oro);color:var(--verde);font-weight:500}
  .barra{height:4px;background:var(--carta2)}
  .barra i{display:block;height:100%;background:linear-gradient(90deg,var(--muschio),var(--oro))}

  .sezioni{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:20px 24px}
  .sez{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:4px;background:var(--carta);text-decoration:none;font-weight:500;font-size:14.5px;border:1px solid transparent;transition:border-color .15s,transform .15s}
  .sez:hover{border-color:var(--oro);transform:translateY(-1px)}
  .sez .ico{width:28px;height:28px;border-radius:50%;background:var(--verde);color:var(--oro);display:grid;place-items:center;font-size:13px;flex:none}

  .galleria{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;padding:0 24px 24px}
  .galleria a{display:block;aspect-ratio:1;border-radius:4px;overflow:hidden;background:var(--carta2);border:1px solid var(--linea)}
  .galleria img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
  .galleria a:hover img{transform:scale(1.06)}
  .etichetta{padding:0 24px 8px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--grigio)}

  /* PIATTAFORME */
  .piatt{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
  .card{display:block;text-decoration:none;background:var(--verde);color:var(--carta);border-radius:6px;padding:22px;position:relative;overflow:hidden;transition:transform .15s}
  .card:hover{transform:translateY(-2px)}
  .card:after{content:"→";position:absolute;right:20px;top:18px;color:var(--oro);font-size:20px}
  .card b{display:block;font-family:'Fraunces',serif;font-size:20px;font-weight:600;margin-bottom:6px;padding-right:24px}
  .card span{font-size:14px;color:#c7c9b8}

  .nota{background:var(--carta2);border-left:3px solid var(--oro);padding:16px 20px;border-radius:0 4px 4px 0;font-size:14.5px;color:#4a4436}
  footer{background:var(--verde);color:#c7c9b8;text-align:center;padding:36px 24px;font-size:14px;margin-top:40px}
  footer a{color:var(--oro);text-decoration:none;font-weight:600}
  @media (max-width:560px){header .in{padding:36px 16px 44px}.marchio{margin-bottom:36px}main{padding:40px 16px 16px}.pagina .testa,.sezioni{padding-left:16px;padding-right:16px}.galleria,.etichetta{padding-left:16px;padding-right:16px}}
</style>
</head>
<body>

<header>
  <div class="foto"></div><div class="velo"></div>
  <div class="in">
    <a class="marchio" href="/"><img src="/logo.jpg" alt=""/><span>Scuola Faunistica Venatoria</span></a>
    <div class="occhiello">Sitemap · Vazzola (TV)</div>
    <h1>Mappa del <em>sito</em></h1>
    <p class="lead">Tutte le pagine della Scuola in un colpo d'occhio: corsi per la licenza di caccia, Zona Alpi, selezione ungulati e biometria, in aula e online.</p>
    <div class="numeri">
      <div class="num"><b><xsl:value-of select="count(s:urlset/s:url)"/></b><small>pagine indicizzate</small></div>
      <div class="num"><b><xsl:value-of select="count(s:urlset/s:url/image:image)"/></b><small>immagini</small></div>
      <div class="num"><b>6</b><small>sezioni in home</small></div>
      <div class="num"><b>4</b><small>piattaforme online</small></div>
    </div>
  </div>
</header>

<main>
  <section>
    <div class="occhiello" style="color:var(--muschio)">01 · Pagine</div>
    <h2>Le pagine del sito</h2>
    <p class="sotto">Ogni pagina con la data dell'ultimo aggiornamento e l'importanza per i motori di ricerca.</p>

    <xsl:for-each select="s:urlset/s:url">
      <xsl:variable name="loc" select="s:loc"/>
      <xsl:variable name="home" select="$loc = 'https://scuolafaunisticavenatoria.it/'"/>
      <div class="pagina">
        <div class="testa">
          <div>
            <h3>
              <xsl:choose>
                <xsl:when test="$home">Home – Scuola Faunistica Venatoria</xsl:when>
                <xsl:when test="contains($loc,'privacy')">Privacy e cookie</xsl:when>
                <xsl:otherwise><xsl:value-of select="$loc"/></xsl:otherwise>
              </xsl:choose>
            </h3>
            <a class="url" href="{$loc}"><xsl:value-of select="$loc"/></a>
          </div>
          <div class="meta">
            <xsl:if test="s:lastmod">
              <span class="tag">Aggiornata <xsl:call-template name="data"><xsl:with-param name="d" select="s:lastmod"/></xsl:call-template></span>
            </xsl:if>
            <xsl:if test="s:changefreq">
              <span class="tag">
                <xsl:choose>
                  <xsl:when test="s:changefreq='daily'">Ogni giorno</xsl:when>
                  <xsl:when test="s:changefreq='weekly'">Ogni settimana</xsl:when>
                  <xsl:when test="s:changefreq='monthly'">Ogni mese</xsl:when>
                  <xsl:when test="s:changefreq='yearly'">Ogni anno</xsl:when>
                  <xsl:otherwise><xsl:value-of select="s:changefreq"/></xsl:otherwise>
                </xsl:choose>
              </span>
            </xsl:if>
            <xsl:if test="s:priority">
              <span class="tag oro">Priorità <xsl:value-of select="format-number(s:priority * 100,'0')"/>%</span>
            </xsl:if>
          </div>
        </div>
        <div class="barra"><i style="width:{format-number(s:priority * 100,'0')}%"></i></div>

        <xsl:if test="$home">
          <div class="sezioni">
            <a class="sez" href="/#chi-siamo"><span class="ico">✦</span>Chi siamo</a>
            <a class="sez" href="/#servizi"><span class="ico">✦</span>Corsi</a>
            <a class="sez" href="/#app"><span class="ico">✦</span>App</a>
            <a class="sez" href="/#news"><span class="ico">✦</span>Corsi in partenza</a>
            <a class="sez" href="/#testimonianze"><span class="ico">✦</span>Testimonianze</a>
            <a class="sez" href="/#contatti"><span class="ico">✦</span>Contatti</a>
          </div>
        </xsl:if>

        <xsl:if test="image:image">
          <div class="etichetta">Immagini · <xsl:value-of select="count(image:image)"/></div>
          <div class="galleria">
            <xsl:for-each select="image:image">
              <a href="{image:loc}" target="_blank" rel="noopener"><img src="{image:loc}" alt="" loading="lazy"/></a>
            </xsl:for-each>
          </div>
        </xsl:if>
      </div>
    </xsl:for-each>
  </section>

  <section>
    <div class="occhiello" style="color:var(--muschio)">02 · Online</div>
    <h2>Le piattaforme della Scuola</h2>
    <p class="sotto">Servizi collegati al sito, per iscriversi, studiare ed esercitarsi.</p>
    <div class="piatt">
      <a class="card" href="https://iscrizione-corsi-sfv-2026-nuovo.netlify.app/"><b>Iscrizione ai corsi</b><span>Modulo di iscrizione ai corsi 2026</span></a>
      <a class="card" href="https://nuova-piattaforma-corsi-scuola-faun.vercel.app/"><b>Piattaforma corsi</b><span>Lezioni e video tutorial online</span></a>
      <a class="card" href="https://quizcacaccia-veneto-sfv-fidc.netlify.app/"><b>Quiz Caccia &amp; Selezione</b><span>Esercitati per l'esame di abilitazione</span></a>
      <a class="card" href="https://nuova-piattaforma-corsi-scuola-faun.vercel.app/montagna/"><b>App Montagna e Pianura</b><span>La scuola in tasca, sul telefono</span></a>
    </div>
  </section>

  <section>
    <p class="nota">Questa pagina è la versione “leggibile” della sitemap: i motori di ricerca come Google leggono lo stesso file in formato XML per scoprire e aggiornare le pagine del sito.</p>
  </section>
</main>

<footer>
  Scuola Faunistica Venatoria · Via Cal Resana 24, Vazzola (TV) · <a href="/">Torna al sito →</a>
</footer>

</body>
</html>
</xsl:template>
</xsl:stylesheet>
