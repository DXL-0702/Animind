'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function DisclaimerPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen theme-bg p-8">
      <div className="max-w-4xl mx-auto bg-base-100 rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold mb-8 text-center">{t('disclaimer.title')}</h1>

        <div className="space-y-6 opacity-80">
          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">1. 服务说明</h2>
            <p>Animind（动漫二创AI工坊）是一个基于AI技术的原创内容创作平台，致力于帮助用户创作100%原创的二次元角色（OC）和相关内容。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">2. 原创性承诺</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>本平台生成的所有内容均为AI原创，不涉及任何现有IP、版权角色或商标内容</li>
              <li>用户不得使用本平台生成侵犯他人知识产权的内容</li>
              <li>用户不得要求AI模仿或生成现有动漫、游戏、影视作品中的角色</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">3. 内容规范</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>禁止生成包含政治敏感、色情暴力、恐怖血腥等违法违规内容</li>
              <li>禁止生成侵犯他人隐私、诽谤他人的内容</li>
              <li>禁止利用本平台进行任何违法犯罪活动</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">4. 版权归属</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>用户通过本平台创作的原创内容，版权归用户所有</li>
              <li>用户授权本平台在必要时展示、推广用户创作的内容</li>
              <li>用户不得将本平台生成的内容用于商业用途，除非获得明确授权</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">5. 免责条款</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>本平台不对AI生成内容的准确性、完整性、适用性做任何保证</li>
              <li>用户使用本平台生成的内容产生的任何法律纠纷，由用户自行承担责任</li>
              <li>本平台保留随时修改、暂停或终止服务的权利</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">6. 数据隐私</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>用户数据存储在本地浏览器，本平台不收集用户个人信息</li>
              <li>用户可随时导出或删除自己的数据</li>
              <li>本平台使用第三方AI服务（智谱AI、DeepSeek等），请参考其隐私政策</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">7. 未成年人保护</h2>
            <p>本平台不适合未满18周岁的未成年人使用。如发现未成年人使用本平台，监护人应立即停止其使用。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">8. 协议变更</h2>
            <p>本平台保留随时修改本协议的权利。修改后的协议将在平台上公布，用户继续使用即视为接受修改后的协议。</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-primary">9. 联系方式</h2>
            <p>如有任何问题或建议，请通过GitHub Issues联系我们。</p>
          </section>

          <div className="mt-8 p-4 bg-warning/10 border border-warning rounded-lg">
            <p className="font-bold text-warning">重要提示：</p>
            <p className="mt-2">使用本平台即表示您已阅读、理解并同意遵守本协议的所有条款。如不同意本协议，请立即停止使用本平台。</p>
          </div>

          <div className="text-center mt-8">
            <a href="/" className="btn btn-primary">{t('disclaimer.agree')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}