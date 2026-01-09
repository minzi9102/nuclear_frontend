<template>
  <div>
    <div class="patient-header-card">
      <div class="header-left">
        <h2 class="patient-name">
          {{ patient.Name }}
          <el-icon :class="patient.Gender === 'male' ? 'icon-male' : 'icon-female'">
            <Male v-if="patient.Gender === 'male'" />
            <Female v-else />
          </el-icon>
        </h2>
        <p class="patient-meta">
          {{ calculateAge(patient.Birthday) }} 岁 | {{ patient.Birthday }}
        </p>
      </div>
      <div class="header-right">
        <el-tag size="large" type="success" effect="dark" round>
          共 {{ treatmentCount }} 次
        </el-tag>
      </div>
    </div>

    <div v-if="patient.past_treatments?.length" class="history-box">
      <span class="label">既往治疗：</span>
      <span class="value">
        {{ getPastTreatmentsText(patient.past_treatments) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Male, Female } from '@element-plus/icons-vue'
import { PAST_TREATMENT_MAP } from '../../constants/treatment'

defineProps<{
  patient: any,
  treatmentCount: number
}>()

const calculateAge = (birthday: string) => {
  if (!birthday) return '?'
  return new Date().getFullYear() - new Date(birthday).getFullYear()
}

const getPastTreatmentsText = (treatments: string[]) => {
  return treatments.map((key: string) => (PAST_TREATMENT_MAP as any)[key] || key).join('、')
}
</script>

<style scoped>
.patient-header-card { background: linear-gradient(135deg, #e3f2fd, #ffffff); border-radius: 12px; padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.patient-name { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 8px; }
.icon-male { color: #2563eb; }
.icon-female { color: #db2777; }
.patient-meta { font-size: 13px; color: #6b7280; margin: 6px 0 0 0; }
.history-box { background-color: #fef2f2; border: 1px solid #fee2e2; padding: 10px 15px; border-radius: 8px; font-size: 13px; color: #b91c1c; margin-bottom: 20px; }
.history-box .label { font-weight: 600; }
</style>