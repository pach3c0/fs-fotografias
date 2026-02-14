const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const Organization = require('../models/Organization');
const User = require('../models/User');
const SiteData = require('../models/SiteData');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const Newsletter = require('../models/Newsletter');

async function migrate() {
  try {
    console.log('🚀 Iniciando migração para multi-tenancy...\n');

    // Conectar ao MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsfotografias';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB\n');

    // 1. Criar Organization
    const ownerSlug = process.env.OWNER_SLUG || 'fs';
    const ownerEmail = process.env.OWNER_EMAIL;
    
    if (!ownerEmail) {
      throw new Error('OWNER_EMAIL não definido no .env');
    }

    console.log(`📦 Criando organização com slug "${ownerSlug}"...`);
    let org = await Organization.findOne({ slug: ownerSlug });
    if (!org) {
      org = await Organization.create({
        name: 'FS Fotografias',
        slug: ownerSlug,
        isActive: true,
        plan: 'pro'
      });
      console.log(`✅ Organização criada: ${org.name} (${org._id})\n`);
    } else {
      console.log(`⚠️  Organização já existe: ${org.name} (${org._id})\n`);
    }

    // 2. Criar User superadmin
    console.log(`👤 Criando usuário superadmin: ${ownerEmail}...`);
    let user = await User.findOne({ email: ownerEmail });
    if (!user) {
      // Usar senha do .env ou gerar uma padrão
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      user = await User.create({
        email: ownerEmail,
        passwordHash: passwordHash,
        name: 'FS Fotografias',
        role: 'superadmin',
        organizationId: org._id,
        approved: true
      });
      console.log(`✅ Usuário criado: ${user.email} (${user._id})`);
      console.log(`   Senha: ${adminPassword}\n`);
    } else {
      console.log(`⚠️  Usuário já existe: ${user.email} (${user._id})\n`);
    }

    // 3. Atualizar ownerId da Organization
    if (!org.ownerId) {
      org.ownerId = user._id;
      await org.save();
      console.log(`✅ Organization.ownerId atualizado\n`);
    }

    // 4. Atualizar documentos existentes
    console.log('📝 Migrando dados existentes...\n');

    const siteDataCount = await SiteData.countDocuments({ organizationId: { $exists: false } });
    if (siteDataCount > 0) {
      const result = await SiteData.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: org._id } }
      );
      console.log(`✅ SiteData: ${result.modifiedCount} documento(s) atualizado(s)`);
    } else {
      console.log(`⚠️  SiteData: nenhum documento sem organizationId`);
    }

    const sessionCount = await Session.countDocuments({ organizationId: { $exists: false } });
    if (sessionCount > 0) {
      const result = await Session.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: org._id } }
      );
      console.log(`✅ Session: ${result.modifiedCount} documento(s) atualizado(s)`);
    } else {
      console.log(`⚠️  Session: nenhum documento sem organizationId`);
    }

    const notificationCount = await Notification.countDocuments({ organizationId: { $exists: false } });
    if (notificationCount > 0) {
      const result = await Notification.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: org._id } }
      );
      console.log(`✅ Notification: ${result.modifiedCount} documento(s) atualizado(s)`);
    } else {
      console.log(`⚠️  Notification: nenhum documento sem organizationId`);
    }

    const newsletterCount = await Newsletter.countDocuments({ organizationId: { $exists: false } });
    if (newsletterCount > 0) {
      const result = await Newsletter.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: org._id } }
      );
      console.log(`✅ Newsletter: ${result.modifiedCount} documento(s) atualizado(s)`);
    } else {
      console.log(`⚠️  Newsletter: nenhum documento sem organizationId`);
    }

    // 5. Migrar uploads para nova estrutura /uploads/{orgId}/
    console.log('\n📁 Migrando arquivos de upload...\n');
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    const orgUploadsDir = path.join(uploadsDir, org._id.toString());
    
    // Criar diretórios da organização
    if (!fs.existsSync(orgUploadsDir)) {
      fs.mkdirSync(orgUploadsDir, { recursive: true });
      console.log(`✅ Criado diretório: ${orgUploadsDir}`);
    }
    
    const orgSessionsDir = path.join(orgUploadsDir, 'sessions');
    if (!fs.existsSync(orgSessionsDir)) {
      fs.mkdirSync(orgSessionsDir, { recursive: true });
      console.log(`✅ Criado diretório: ${orgSessionsDir}`);
    }
    
    const orgVideosDir = path.join(orgUploadsDir, 'videos');
    if (!fs.existsSync(orgVideosDir)) {
      fs.mkdirSync(orgVideosDir, { recursive: true });
      console.log(`✅ Criado diretório: ${orgVideosDir}`);
    }

    // Mover arquivos de sessões e atualizar URLs no banco
    const sessionsDir = path.join(uploadsDir, 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const sessionFiles = fs.readdirSync(sessionsDir);
      for (const file of sessionFiles) {
        const oldPath = path.join(sessionsDir, file);
        const newPath = path.join(orgSessionsDir, file);
        
        if (fs.statSync(oldPath).isFile()) {
          fs.renameSync(oldPath, newPath);
          console.log(`  📦 Movido: sessions/${file} → ${org._id}/sessions/${file}`);
        }
      }
    }

    // Atualizar URLs das fotos nas sessões
    const sessions = await Session.find({ organizationId: org._id });
    for (const session of sessions) {
      let updated = false;
      session.photos = session.photos.map(photo => {
        if (photo.url && photo.url.startsWith('/uploads/sessions/') && !photo.url.includes(org._id.toString())) {
          updated = true;
          return {
            ...photo,
            url: photo.url.replace('/uploads/sessions/', `/uploads/${org._id}/sessions/`)
          };
        }
        return photo;
      });
      
      if (updated) {
        await session.save();
        console.log(`  📝 Atualizado URLs da sessão: ${session.name}`);
      }
    }

    // Mover vídeos
    const videosDir = path.join(uploadsDir, 'videos');
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir);
      for (const file of videoFiles) {
        const oldPath = path.join(videosDir, file);
        const newPath = path.join(orgVideosDir, file);
        
        if (fs.statSync(oldPath).isFile()) {
          fs.renameSync(oldPath, newPath);
          console.log(`  📦 Movido: videos/${file} → ${org._id}/videos/${file}`);
        }
      }
    }

    // Atualizar URLs de imagens no SiteData (hero, about, portfolio, etc)
    const siteData = await SiteData.findOne({ organizationId: org._id });
    if (siteData) {
      let updated = false;
      
      // Hero
      if (siteData.hero?.image && siteData.hero.image.startsWith('/uploads/') && !siteData.hero.image.includes(org._id.toString())) {
        const filename = path.basename(siteData.hero.image);
        const oldPath = path.join(uploadsDir, filename);
        if (fs.existsSync(oldPath)) {
          const newPath = path.join(orgUploadsDir, filename);
          fs.renameSync(oldPath, newPath);
          siteData.hero.image = `/uploads/${org._id}/${filename}`;
          updated = true;
          console.log(`  📦 Movido e atualizado: hero.image → ${siteData.hero.image}`);
        }
      }

      // About
      if (siteData.about?.image && siteData.about.image.startsWith('/uploads/') && !siteData.about.image.includes(org._id.toString())) {
        const filename = path.basename(siteData.about.image);
        const oldPath = path.join(uploadsDir, filename);
        if (fs.existsSync(oldPath)) {
          const newPath = path.join(orgUploadsDir, filename);
          fs.renameSync(oldPath, newPath);
          siteData.about.image = `/uploads/${org._id}/${filename}`;
          updated = true;
          console.log(`  📦 Movido e atualizado: about.image → ${siteData.about.image}`);
        }
      }

      // Logo
      if (siteData.logo?.image && siteData.logo.image.startsWith('/uploads/') && !siteData.logo.image.includes(org._id.toString())) {
        const filename = path.basename(siteData.logo.image);
        const oldPath = path.join(uploadsDir, filename);
        if (fs.existsSync(oldPath)) {
          const newPath = path.join(orgUploadsDir, filename);
          fs.renameSync(oldPath, newPath);
          siteData.logo.image = `/uploads/${org._id}/${filename}`;
          updated = true;
          console.log(`  📦 Movido e atualizado: logo.image → ${siteData.logo.image}`);
        }
      }

      // Helper: mover arquivo de /uploads/ para /uploads/{orgId}/ e retornar nova URL
      function migrateFile(url, targetDir) {
        if (!url || !url.startsWith('/uploads/') || url.includes(org._id.toString())) return url;
        const filename = path.basename(url);
        // Determinar path antigo baseado na URL
        const oldPath = path.join(uploadsDir, url.replace('/uploads/', ''));
        if (fs.existsSync(oldPath)) {
          const newPath = path.join(targetDir, filename);
          fs.renameSync(oldPath, newPath);
          const newUrl = `/uploads/${org._id}/${targetDir === orgUploadsDir ? '' : path.relative(orgUploadsDir, targetDir) + '/'}${filename}`.replace(/\/\//g, '/');
          console.log(`  📦 Movido: ${url} → ${newUrl}`);
          return newUrl;
        }
        return url;
      }

      // About.images (array de objetos com campo image)
      if (Array.isArray(siteData.about?.images) && siteData.about.images.length > 0) {
        siteData.about.images = siteData.about.images.map(img => {
          if (img.image && img.image.startsWith('/uploads/') && !img.image.includes(org._id.toString())) {
            const filename = path.basename(img.image);
            const oldPath = path.join(uploadsDir, filename);
            if (fs.existsSync(oldPath)) {
              const newPath = path.join(orgUploadsDir, filename);
              fs.renameSync(oldPath, newPath);
              img.image = `/uploads/${org._id}/${filename}`;
              updated = true;
              console.log(`  📦 Movido: about.images → ${img.image}`);
            }
          }
          return img;
        });
      }

      // Portfolio (array de objetos com campo image)
      if (Array.isArray(siteData.portfolio) && siteData.portfolio.length > 0) {
        siteData.portfolio = siteData.portfolio.map(item => {
          const imgUrl = typeof item === 'string' ? item : item?.image;
          if (imgUrl && imgUrl.startsWith('/uploads/') && !imgUrl.includes(org._id.toString())) {
            const filename = path.basename(imgUrl);
            const oldPath = path.join(uploadsDir, filename);
            if (fs.existsSync(oldPath)) {
              const newPath = path.join(orgUploadsDir, filename);
              fs.renameSync(oldPath, newPath);
              const newUrl = `/uploads/${org._id}/${filename}`;
              updated = true;
              console.log(`  📦 Movido: portfolio → ${newUrl}`);
              if (typeof item === 'string') return newUrl;
              item.image = newUrl;
            }
          }
          return item;
        });
      }

      // Studio.photos (array de objetos com campo image)
      if (Array.isArray(siteData.studio?.photos) && siteData.studio.photos.length > 0) {
        siteData.studio.photos = siteData.studio.photos.map(photo => {
          if (photo.image && photo.image.startsWith('/uploads/') && !photo.image.includes(org._id.toString())) {
            const filename = path.basename(photo.image);
            const oldPath = path.join(uploadsDir, filename);
            if (fs.existsSync(oldPath)) {
              const newPath = path.join(orgUploadsDir, filename);
              fs.renameSync(oldPath, newPath);
              photo.image = `/uploads/${org._id}/${filename}`;
              updated = true;
              console.log(`  📦 Movido: studio.photos → ${photo.image}`);
            }
          }
          return photo;
        });
      }

      // Studio.videoUrl
      if (siteData.studio?.videoUrl && siteData.studio.videoUrl.startsWith('/uploads/') && !siteData.studio.videoUrl.includes(org._id.toString())) {
        const filename = path.basename(siteData.studio.videoUrl);
        const oldPath = path.join(uploadsDir, 'videos', filename);
        if (fs.existsSync(oldPath)) {
          const newPath = path.join(orgVideosDir, filename);
          fs.renameSync(oldPath, newPath);
          siteData.studio.videoUrl = `/uploads/${org._id}/videos/${filename}`;
          updated = true;
          console.log(`  📦 Movido: studio.videoUrl → ${siteData.studio.videoUrl}`);
        }
      }

      // Albums (array de objetos com cover e photos[])
      if (Array.isArray(siteData.albums) && siteData.albums.length > 0) {
        siteData.albums = siteData.albums.map(album => {
          // Cover
          if (album.cover && album.cover.startsWith('/uploads/') && !album.cover.includes(org._id.toString())) {
            const filename = path.basename(album.cover);
            const oldPath = path.join(uploadsDir, filename);
            if (fs.existsSync(oldPath)) {
              const newPath = path.join(orgUploadsDir, filename);
              fs.renameSync(oldPath, newPath);
              album.cover = `/uploads/${org._id}/${filename}`;
              updated = true;
              console.log(`  📦 Movido: album cover → ${album.cover}`);
            }
          }
          // Photos
          if (Array.isArray(album.photos)) {
            album.photos = album.photos.map(photoUrl => {
              if (typeof photoUrl === 'string' && photoUrl.startsWith('/uploads/') && !photoUrl.includes(org._id.toString())) {
                const filename = path.basename(photoUrl);
                const oldPath = path.join(uploadsDir, filename);
                if (fs.existsSync(oldPath)) {
                  const newPath = path.join(orgUploadsDir, filename);
                  fs.renameSync(oldPath, newPath);
                  const newUrl = `/uploads/${org._id}/${filename}`;
                  updated = true;
                  console.log(`  📦 Movido: album photo → ${newUrl}`);
                  return newUrl;
                }
              }
              return photoUrl;
            });
          }
          return album;
        });
      }

      if (updated) {
        // Usar markModified para campos Mixed/Array que o Mongoose pode nao detectar
        siteData.markModified('portfolio');
        siteData.markModified('studio');
        siteData.markModified('albums');
        siteData.markModified('about');
        await siteData.save();
        console.log(`  📝 SiteData atualizado com novas URLs`);
      }
    }

    console.log('\n✅ Migração concluída com sucesso!\n');
    console.log('📋 Resumo:');
    console.log(`   Organization: ${org.name} (${org.slug})`);
    console.log(`   User: ${user.email} (${user.role})`);
    console.log(`   Organization ID: ${org._id}`);
    console.log('\n🔑 Próximos passos:');
    console.log('   1. Adicionar ao .env:');
    console.log(`      BASE_DOMAIN=fsfotografias.com.br`);
    console.log(`      OWNER_SLUG=${ownerSlug}`);
    console.log(`      OWNER_EMAIL=${ownerEmail}`);
    console.log('   2. Reiniciar o servidor');
    console.log('   3. Fazer login com o email cadastrado\n');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

migrate();
