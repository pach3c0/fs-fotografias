/**
 * Script de migracao unica: hero-data.json + faq-data.json -> MongoDB
 *
 * Executar: node migrate-json-to-mongo.js
 * Depois de confirmar que os dados estao no MongoDB, deletar este arquivo e os JSONs.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const SiteData = require('./src/models/SiteData');

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';
  console.log('Conectando ao MongoDB...');

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });
  console.log('Conectado.');

  // Ler arquivos JSON
  let heroData = {};
  let faqData = { faqs: [] };

  const heroPath = path.join(__dirname, 'src/data/hero-data.json');
  const faqPath = path.join(__dirname, 'src/data/faq-data.json');

  if (fs.existsSync(heroPath)) {
    heroData = JSON.parse(fs.readFileSync(heroPath, 'utf8'));
    console.log('Hero data lido:', heroData.title);
  } else {
    console.log('hero-data.json nao encontrado, pulando.');
  }

  if (fs.existsSync(faqPath)) {
    faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
    console.log('FAQ data lido:', faqData.faqs?.length, 'FAQs');
  } else {
    console.log('faq-data.json nao encontrado, pulando.');
  }

  // Verificar se ja existe documento no MongoDB
  const existing = await SiteData.findOne();

  if (existing) {
    console.log('Documento SiteData encontrado, atualizando hero e faq...');
    await SiteData.collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          hero: { ...existing.hero, ...heroData },
          faq: faqData
        }
      }
    );
  } else {
    console.log('Nenhum documento SiteData encontrado, criando novo...');
    await SiteData.create({
      hero: heroData,
      faq: faqData
    });
  }

  // Verificar
  const result = await SiteData.findOne().lean();
  console.log('\nMigracao concluida!');
  console.log('Hero title:', result.hero?.title);
  console.log('FAQs count:', result.faq?.faqs?.length || 0);

  await mongoose.disconnect();
  console.log('\nDesconectado. Pode deletar os arquivos JSON e este script.');
}

migrate().catch(err => {
  console.error('Erro na migracao:', err);
  process.exit(1);
});
