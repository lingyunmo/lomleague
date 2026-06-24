<template>
  <div class="invite-page">
    <div class="invite-card">
      <h2>📄 生成入盟通知书</h2>
      <p class="invite-desc">填写信息，生成正式录取通知书及入盟须知（PDF）</p>

      <n-form :model="form" label-placement="left" label-width="100px" class="invite-form">
        <n-form-item label="B站昵称">
          <n-input v-model:value="form.nickname" placeholder="你的B站显示名称" size="large" />
        </n-form-item>
        <n-form-item label="B站 UID">
          <n-input v-model:value="form.uid" placeholder="B站个人空间URL末尾的数字" size="large" />
        </n-form-item>
        <n-form-item label="擅长方向">
          <n-select v-model:value="form.skill" placeholder="选择或输入你擅长的方向" size="large" filterable tag :options="skillOptions" />
        </n-form-item>
        <n-button type="primary" size="large" block :loading="generating" @click="generateOffer">
          <template #icon><n-icon><Download /></n-icon></template>
          生成录取通知书 (PDF)
        </n-button>
      </n-form>
    </div>

    <div ref="offerRef" class="offer-render">
      <!-- ====== 页 1：正式录取通知书 ====== -->
      <div class="offer-page">
        <!-- 顶部装饰线 -->
        <div class="page1-top-border"></div>
        <div class="page1-top-line"></div>

        <!-- 校徽 + 标题 -->
        <div class="page1-header">
          <div class="page1-crest">
            <div class="crest-outer"><div class="crest-inner">LOM</div></div>
          </div>
          <div class="page1-org">lom League</div>
          <div class="page1-org-sub">Legacy Of Minecraft League</div>
          <div class="page1-org-established">Est. 2014</div>
        </div>

        <!-- 文件标题 -->
        <div class="page1-doc-title">
          <div class="doc-title-main">OFFER OF ADMISSION</div>
          <div class="doc-title-en">Full-Time Core Membership Programme</div>
          <div class="doc-title-bar"></div>
        </div>

        <!-- 编号区 -->
        <div class="page1-meta">
          <div class="meta-left">
            <div class="meta-label">Admission Reference</div>
            <div class="meta-value">{{ studentId }}</div>
          </div>
          <div class="meta-right">
            <div class="meta-label">Date of Issue</div>
            <div class="meta-value">{{ today }}</div>
          </div>
        </div>

        <!-- 正文 -->
        <div class="page1-body">
          <p class="body-greeting">Dear <strong>{{ form.nickname || '_______________' }}</strong>,</p>

          <p>On behalf of the <strong>Admissions Committee of the lom League</strong>, I am pleased to inform you that your application for membership has been carefully reviewed and <strong>accepted</strong>. We were impressed by your demonstrated abilities in <strong>{{ form.skill || '_______________' }}</strong>, and we believe you will make a valuable contribution to our community.</p>

          <p>You are hereby offered admission to the <strong>lom League</strong> as a <strong>Core Member</strong> for the {{ year }} academic session.</p>

          <!-- 信息表 -->
          <table class="info-table">
<tbody>
            <tr><td class="info-label">Student ID</td><td class="info-val">{{ studentId }}</td></tr>
            <tr><td class="info-label">Bilibili UID</td><td class="info-val">{{ form.uid || '_______________' }}</td></tr>
            <tr><td class="info-label">Programme</td><td class="info-val">{{ form.skill || '_______________' }}</td></tr>
            <tr><td class="info-label">Duration</td><td class="info-val">Indefinite (with option to withdraw)</td></tr>
            <tr><td class="info-label">Campus</td><td class="info-val">mc.bzlom.cn Server · common-net Virtual Campus</td></tr>
          </tbody>
          </table>

          <!-- 条件 -->
          <p><strong>Conditions of Admission:</strong></p>
          <p>This offer is conditional upon your acceptance of the lom League Charter and Code of Conduct. You are required to confirm your acceptance by contacting the Admissions Office <strong>on or before {{ deadline }}</strong>. Failure to respond by this date may result in the withdrawal of this offer.</p>

          <!-- 联系框 -->
          <div class="contact-box">
            <div class="contact-box-title">Admissions Office</div>
            <div class="contact-box-row"><span>WeChat</span> <strong>lingyunmo1</strong></div>
            <div class="contact-box-row"><span>QQ</span> <strong>2087789639</strong></div>
            <div class="contact-box-row"><span>Website</span> <strong>www.bzlom.cn</strong></div>
          </div>

          <p>We look forward to welcoming you to the lom League and supporting you in your journey of creativity, collaboration, and growth within the Minecraft community.</p>

          <p class="body-closing">Yours sincerely,</p>
        </div>

        <!-- 签名区 -->
        <div class="page1-signature">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">Admissions Committee</div>
            <div class="sig-title">lom League</div>
          </div>
          <div class="sig-stamp">
            <div class="stamp-circle">
              <div class="stamp-text">lom League<br/>Admissions<br/>ADMITTED</div>
            </div>
          </div>
        </div>

        <!-- 底部装饰 -->
        <div class="page1-footer">
          <div class="footer-line"></div>
          <div class="footer-address">lom League · Legacy Of Minecraft League · Est. 2014 · www.bzlom.cn</div>
        </div>
      </div>

      <!-- ====== 页 2：入盟须知 ====== -->
      <div class="offer-page">
        <div class="page1-top-border"></div>
        <div class="page1-top-line"></div>

        <div class="page1-header" style="margin-bottom:16px">
          <div class="page1-org" style="font-size:22px">lom League</div>
          <div class="page1-org-sub">Legacy Of Minecraft League</div>
        </div>

        <div class="page1-doc-title" style="margin-bottom:16px">
          <div class="doc-title-main" style="font-size:20px">ENROLLMENT INFORMATION</div>
          <div class="doc-title-en">For Admitted Core Members</div>
          <div class="doc-title-bar"></div>
        </div>

        <div class="page2-body">
          <p class="page2-greeting">Dear <strong>{{ form.nickname || '_______________' }}</strong>,</p>
          <p>Welcome to the lom League. Please read the following information carefully to ensure a smooth transition into our community.</p>

          <div class="section">
            <div class="section-num">1</div>
            <div class="section-content">
              <h4>About the lom League</h4>
              <p>Founded in 2014, the lom League (Legacy Of Minecraft League) is a Minecraft-based creative community that has grown from a small group of enthusiasts into a vibrant network of over 20 core members. Over the past twelve years, we have produced more than 300 videos, developed 2 original mods, and completed 3 micro-films. Our community spans multiple platforms including Bilibili, Youku, and our official website at www.bzlom.cn. We are not a commercial entity or a professional studio — we are a genuine player community built on passion, creativity, and friendship.</p>
            </div>
          </div>

          <div class="section">
            <div class="section-num">2</div>
            <div class="section-content">
              <h4>Rights &amp; Responsibilities</h4>
              <p>As a Core Member, you shall enjoy unrestricted access to all lom League Minecraft servers (including mc.bzlom.cn), the right to participate in all community events including competitive tournaments, singing competitions, and casual gaming sessions, and the right to contribute to lom League content creation including videos, mods, and server builds.</p>
              <p>You are expected to uphold the reputation of the lom League in all public spaces, adopt the "lom_" naming prefix across platforms for community identity, comply with the lom League Charter and all applicable community guidelines, and support fellow members in their creative endeavors.</p>
            </div>
          </div>

          <div class="section">
            <div class="section-num">3</div>
            <div class="section-content">
              <h4>Code of Conduct</h4>
              <p>Members shall not hold dual membership in competing Minecraft alliances. Content creation shall prioritize authenticity over sensationalism — clickbait is strictly prohibited. All members must treat each other with respect; mockery, exclusion, and public confrontation are unacceptable. Disputes should be resolved through private communication. Where necessary, escalate to the management team for mediation.</p>
            </div>
          </div>

          <!-- 三栏联系 -->
          <div class="contact-box" style="margin-top:16px">
            <div class="contact-box-title">Contact &amp; Resources</div>
            <div class="contact-box-row"><span>WeChat</span> <strong>lingyunmo1</strong></div>
            <div class="contact-box-row"><span>QQ</span> <strong>2087789639</strong></div>
            <div class="contact-box-row"><span>Official Website</span> <strong>www.bzlom.cn</strong></div>
            <div class="contact-box-row"><span>Anniversary</span> <strong>anniversary.bzlom.cn</strong></div>
            <div class="contact-box-row"><span>Minecraft Server</span> <strong>mc.bzlom.cn</strong></div>
          </div>

          <p style="text-align:center;margin-top:20px;font-style:italic">
            Legacy Of Minecraft, Legacy Of Us.<br/>
            Welcome to the lom League.
          </p>
        </div>

        <div class="page1-footer">
          <div class="footer-line"></div>
          <div class="footer-address">lom League · Legacy Of Minecraft League · Est. 2014 · www.bzlom.cn</div>
        </div>
      </div>

      <!-- ====== 页 3：中文翻译 — 录取通知书 ====== -->
      <div class="offer-page">
        <div class="page1-top-border"></div>
        <div class="page1-top-line"></div>

        <div class="page1-header">
          <div class="page1-crest">
            <div class="crest-outer"><div class="crest-inner">LOM</div></div>
          </div>
          <div class="page1-org">lom League</div>
          <div class="page1-org-sub">Legacy Of Minecraft League</div>
          <div class="page1-org-established">Est. 2014</div>
        </div>

        <div class="page1-doc-title">
          <div class="doc-title-main" style="font-size:22px">录 取 通 知 书</div>
          <div class="doc-title-en">OFFER OF ADMISSION · 中文译本</div>
          <div class="doc-title-bar"></div>
        </div>

        <div class="disclaimer-box">
          本文件为英文原版录取通知书之中文译本。如中文译本与英文原版在语义上存在歧义，<strong>以英文原版为准</strong>。
        </div>

        <div class="page1-meta">
          <div class="meta-left">
            <div class="meta-label">录取编号</div>
            <div class="meta-value">{{ studentId }}</div>
          </div>
          <div class="meta-right">
            <div class="meta-label">签发日期</div>
            <div class="meta-value">{{ todayCN }}</div>
          </div>
        </div>

        <div class="page1-body cn-text">
          <p class="body-greeting"><strong>{{ form.nickname || '_______________' }}</strong> 同学：</p>

          <p>经 <strong>lom 联盟招生委员会</strong> 审议，您的入盟申请已获 <strong>批准</strong>。您在 <strong>{{ form.skill || '_______________' }}</strong> 方向展现的能力给我们留下了深刻印象，我们相信您将为联盟做出宝贵贡献。</p>

          <p>兹录取您为 <strong>lom 联盟 {{ year }} 年度核心成员</strong>。</p>

          <table class="info-table">
<tbody>
            <tr><td class="info-label">学生 ID</td><td class="info-val">{{ studentId }}</td></tr>
            <tr><td class="info-label">B站 UID</td><td class="info-val">{{ form.uid || '_______________' }}</td></tr>
            <tr><td class="info-label">录取方向</td><td class="info-val">{{ form.skill || '_______________' }}</td></tr>
            <tr><td class="info-label">学制</td><td class="info-val">无限期（可主动退学）</td></tr>
            <tr><td class="info-label">校区</td><td class="info-val">mc.bzlom.cn 服务器 · common-net 虚拟校区</td></tr>
          </tbody>
          </table>

          <p><strong>录取条件：</strong></p>
          <p>本录取通知以您同意并遵守 lom 联盟章程及行为准则为条件。请在 <strong>{{ deadlineCN }}</strong> 前联系招生办公室确认接受本录取。逾期未确认者，本录取通知自动失效。</p>

          <div class="contact-box">
            <div class="contact-box-title">招生办公室联系方式</div>
            <div class="contact-box-row"><span>微信</span> <strong>lingyunmo1</strong></div>
            <div class="contact-box-row"><span>QQ</span> <strong>2087789639</strong></div>
            <div class="contact-box-row"><span>官网</span> <strong>www.bzlom.cn</strong></div>
          </div>

          <p>我们期待您加入 lom 联盟，在 Minecraft 社区中共同创造、协作、成长。</p>
          <p class="body-closing">此致</p>
        </div>

        <div class="page1-signature">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">lom 联盟招生委员会</div>
            <div class="sig-title">招生办公室</div>
          </div>
          <div class="sig-stamp">
            <div class="stamp-circle">
              <div class="stamp-text">lom 联盟<br/>招生委员会<br/>已录取</div>
            </div>
          </div>
        </div>

        <div class="page1-footer">
          <div class="footer-line"></div>
          <div class="footer-address">lom 联盟 · Legacy Of Minecraft League · Est. 2014 · www.bzlom.cn</div>
        </div>
      </div>

      <!-- ====== 页 4：中文翻译 — 入盟须知 ====== -->
      <div class="offer-page">
        <div class="page1-top-border"></div>
        <div class="page1-top-line"></div>

        <div class="page1-header" style="margin-bottom:16px">
          <div class="page1-org" style="font-size:22px">lom 联盟</div>
          <div class="page1-org-sub">Legacy Of Minecraft League</div>
        </div>

        <div class="page1-doc-title" style="margin-bottom:16px">
          <div class="doc-title-main" style="font-size:20px">ENROLLMENT INFORMATION</div>
          <div class="doc-title-en">ENROLLMENT INFORMATION · 中文译本</div>
          <div class="doc-title-bar"></div>
        </div>

        <div class="disclaimer-box">
          本文件为英文原版入盟须知之中文译本。如中文译本与英文原版在语义上存在歧义，<strong>以英文原版为准</strong>。
        </div>

        <div class="page2-body cn-text">
          <p class="page2-greeting"><strong>{{ form.nickname || '_______________' }}</strong> 同学：</p>
          <p>欢迎加入 lom 联盟。请仔细阅读以下须知，确保顺利融入本社区。</p>

          <div class="section">
            <div class="section-num">1</div>
            <div class="section-content">
              <h4>关于 lom 联盟</h4>
              <p>lom 联盟（Legacy Of Minecraft League）成立于 2014 年，是一个以 Minecraft 为纽带的创作社区，从最初的几名爱好者发展至今，拥有 20+ 核心成员。十二年间，我们共产出 300+ 视频、2 个自研 Mod、3 部微电影。社区覆盖 B站、优酷及官方网站 www.bzlom.cn。我们不是商业机构，也不是专业工作室——我们是一个由热情、创造力和友谊凝聚而成的真实玩家社区。</p>
            </div>
          </div>

          <div class="section">
            <div class="section-num">2</div>
            <div class="section-content">
              <h4>权责与义务</h4>
              <p>作为核心成员，您享有：自由进出 lom 联盟所有 Minecraft 服务器（含 mc.bzlom.cn）的权利；参与全部社区活动（竞技赛、歌会、水友赛等）的权利；参与 lom 联盟内容创作（视频、Mod、服务器建筑等）的权利。</p>
              <p>您应尽义务：在所有公开平台维护 lom 联盟声誉；建议在各平台使用「lom_」前缀命名以树立社区品牌形象；遵守 lom 联盟章程及全部社区准则；支持其他成员的创作活动。</p>
            </div>
          </div>

          <div class="section">
            <div class="section-num">3</div>
            <div class="section-content">
              <h4>行为准则</h4>
              <p>成员不得同时加入与我方存在竞争关系的 Minecraft 联盟。内容创作应以真实为本，严禁标题党。全体成员须互相尊重，禁止嘲讽、排挤及公开冲突。争议应通过私下沟通解决，必要时可申请管理组介入调解。</p>
            </div>
          </div>

          <div class="contact-box" style="margin-top:16px">
            <div class="contact-box-title">联系方式与资源</div>
            <div class="contact-box-row"><span>微信</span> <strong>lingyunmo1</strong></div>
            <div class="contact-box-row"><span>QQ</span> <strong>2087789639</strong></div>
            <div class="contact-box-row"><span>官方网站</span> <strong>www.bzlom.cn</strong></div>
            <div class="contact-box-row"><span>周年纪念</span> <strong>anniversary.bzlom.cn</strong></div>
            <div class="contact-box-row"><span>MC 服务器</span> <strong>mc.bzlom.cn</strong></div>
          </div>

          <p style="text-align:center;margin-top:20px;font-style:italic">
            我们的世界，我们的遗产。<br/>
            欢迎加入 lom 联盟。
          </p>
        </div>

        <div class="page1-footer">
          <div class="footer-line"></div>
          <div class="footer-address">lom 联盟 · Legacy Of Minecraft League · Est. 2014 · www.bzlom.cn</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { Download } from '@vicons/ionicons5'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const message = useMessage()
const offerRef = ref(null)
const generating = ref(false)

const form = ref({ nickname: '', uid: '', skill: '' })

const skillOptions = [
  { label: '红石工程师', value: 'Redstone Engineering' },
  { label: '建筑大师', value: 'Architectural Design' },
  { label: 'PVP战神', value: 'Combat & PVP' },
  { label: '生存专家', value: 'Survival Expertise' },
  { label: '模组开发者', value: 'Mod Development' },
  { label: '跑酷高手', value: 'Parkour & Movement' },
  { label: '微电影导演', value: 'Cinematography' },
  { label: '材质画师', value: 'Texture Art & Design' },
  { label: '服务器运维', value: 'Server Administration' },
  { label: '什么都沾点', value: 'General Studies' },
]

const studentId = computed(() => `LOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`)

const year = new Date().getFullYear()
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const todayCN = `${year}年${new Date().getMonth() + 1}月${new Date().getDate()}日`
const deadline = computed(() => {
  const d = new Date(); d.setMonth(d.getMonth() + 3)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
})
const deadlineCN = computed(() => {
  const d = new Date(); d.setMonth(d.getMonth() + 3)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const generateOffer = async () => {
  if (!form.value.nickname || !form.value.uid || !form.value.skill) {
    message.warning('请填写所有字段')
    return
  }
  generating.value = true
  try {
    const pages = offerRef.value.querySelectorAll('.offer-page')
    const pdf = new jsPDF('p', 'mm', 'a4')
    let first = true
    for (const page of pages) {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#fafaf8' })
      const imgData = canvas.toDataURL('image/png')
      const w = 210, h = (canvas.height * w) / canvas.width
      if (first) first = false; else pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, 0, w, Math.min(h, 297))
    }
    pdf.save(`lom_admission_${form.value.nickname}.pdf`)
    message.success('录取通知书已生成！')
  } catch { message.error('Generation failed') }
  finally { generating.value = false }
}
</script>

<style scoped>
.invite-page {
  min-height: 100%; display: flex; align-items: flex-start; justify-content: center;
  padding: 48px 24px;
  background: linear-gradient(180deg, var(--color-bg-gradient-start), var(--color-bg-dark) 60%);
}
.invite-card {
  width: 480px; max-width: 100%;
  background: var(--glass-bg); backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border); border-radius: 20px; padding: 36px 32px;
}
.invite-card h2 { margin: 0 0 4px; font-size: 24px; color: var(--color-text-primary); text-align: center; }
.invite-desc { margin: 0 0 28px; font-size: 14px; color: var(--color-text-muted); text-align: center; }
.invite-form { display: flex; flex-direction: column; gap: 4px; }

/* ====== PDF Render ====== */
.offer-render { position: absolute; left: -9999px; top: 0; width: 794px; }

.offer-page {
  width: 794px; min-height: 1123px; background: #fafaf8;
  color: #1a1a1e; font-family: 'Georgia', 'Times New Roman', serif;
  padding: 56px 60px; box-sizing: border-box;
  page-break-after: always; margin-bottom: 24px;
  position: relative;
}

/* 顶部装饰 */
.page1-top-border { height: 4px; background: #1a1a2e; margin: 0 0 6px 0; }
.page1-top-line { height: 1px; background: #aaa; margin-bottom: 32px; }

/* Header */
.page1-header { text-align: center; margin-bottom: 24px; }
.page1-crest { margin-bottom: 14px; display: flex; justify-content: center; }
.crest-outer {
  width: 64px; height: 64px; border: 2px solid #1a1a2e; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.crest-inner { font-size: 16px; font-weight: 900; color: #1a1a2e; letter-spacing: 1px; }
.page1-org { font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #1a1a2e; }
.page1-org-sub { font-size: 10px; color: #777; letter-spacing: 2px; text-transform: uppercase; }
.page1-org-established { font-size: 9px; color: #aaa; margin-top: 2px; font-style: italic; }

/* Document Title */
.page1-doc-title { text-align: center; margin-bottom: 28px; }
.doc-title-main { font-size: 24px; font-weight: 900; letter-spacing: 8px; color: #1a1a2e; }
.doc-title-en { font-size: 9px; color: #999; letter-spacing: 3px; font-style: italic; }
.doc-title-bar { width: 40px; height: 2px; background: #1a1a2e; margin: 10px auto 0; }

/* Meta */
.page1-meta { display: flex; justify-content: space-between; margin-bottom: 28px; font-family: 'Courier New', monospace; }
.meta-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
.meta-value { font-size: 12px; color: #1a1a2e; font-weight: bold; }

/* Body */
.page1-body { font-size: 12px; line-height: 1.9; color: #333; font-family: 'Georgia', 'Times New Roman', serif; }
.page1-body p { margin: 0 0 10px 0; text-align: justify; }
.body-greeting { font-size: 13px; margin-bottom: 16px !important; }
.body-closing { margin-top: 20px !important; }

.info-table { width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #ddd; }
.info-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
.info-label { width: 130px; background: #f4f4f4; color: #666; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
.info-val { color: #1a1a2e; font-weight: 600; }

.contact-box { background: #f4f4f4; border-left: 3px solid #1a1a2e; padding: 10px 14px; margin: 16px 0; }
.contact-box-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
.contact-box-row { font-size: 11px; line-height: 1.8; }
.contact-box-row span { display: inline-block; width: 100px; color: #888; font-size: 10px; }

/* Signature */
.page1-signature { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; }
.sig-block { flex: 1; }
.sig-line { width: 200px; height: 1px; background: #1a1a2e; margin-bottom: 6px; }
.sig-name { font-size: 12px; color: #1a1a2e; font-weight: bold; }
.sig-title { font-size: 10px; color: #888; }

.sig-stamp { flex-shrink: 0; }
.stamp-circle {
  width: 80px; height: 80px; border: 2.5px solid #8b0000; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 900; color: #8b0000; text-align: center;
  line-height: 1.3; opacity: .7; transform: rotate(-12deg);
}
.stamp-text { font-family: 'Georgia', serif; }

/* Footer */
.page1-footer { position: absolute; bottom: 40px; left: 60px; right: 60px; text-align: center; }
.footer-line { height: 1px; background: #ddd; margin-bottom: 6px; }
.footer-address { font-size: 8px; color: #bbb; letter-spacing: .5px; text-transform: uppercase; }

/* ====== Page 2 ====== */
.page2-body { font-size: 12px; line-height: 1.9; color: #333; font-family: 'Georgia', serif; }
.page2-greeting { font-size: 13px; margin-bottom: 14px; }
.page2-body p { margin: 0 0 8px 0; }

.section { display: flex; gap: 14px; margin: 16px 0; }
.section-num {
  width: 28px; height: 28px; background: #1a1a2e; color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: bold; flex-shrink: 0;
}
.section-content { flex: 1; }
.section-content h4 { margin: 0 0 4px 0; font-size: 13px; color: #1a1a2e; }

.disclaimer-box {
  background: #faf8f0; border: 1px dashed #c9b96e; border-left: 3px solid #c9b96e;
  padding: 8px 12px; margin-bottom: 20px;
  font-size: 10px; color: #887b3e; font-style: italic; text-align: center;
}

.cn-text p { text-indent: 2em; }
.cn-text .body-greeting { text-indent: 0; }
.cn-text .body-closing { text-indent: 0 !important; }
</style>
