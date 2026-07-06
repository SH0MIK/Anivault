export const PROFILE_CSS = `.avatar-cropper-modal {
  max-width: calc(100vw - 1rem);
  width: min(calc(100vw - 1rem), 720px);
  max-height: calc(100vh - 1rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.avatar-cropper-modal .modal-header {
  flex: 0 0 auto;
  padding: 14px;
}
.avatar-cropper-modal .modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 14px 14px;
  scrollbar-color: var(--accent) rgba(255,255,255,0.08);
  scrollbar-width: thin;
}
.avatar-cropper-modal .modal-body::-webkit-scrollbar { width: 10px; }
.avatar-cropper-modal .modal-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.08); border-radius: 999px; }
.avatar-cropper-modal .modal-body::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 999px; }
.avatar-crop-stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  margin: 0 auto 12px;
  background: #020611;
  border-radius: var(--radius-md);
  overflow: hidden;
  touch-action: none;
}
.avatar-crop-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 14px;
  margin-bottom: 12px;
}
.avatar-crop-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: end;
}
.avatar-crop-footer > p { flex: 1 1 180px; margin: 0; }
.avatar-crop-previews,
.avatar-crop-actions { display: flex; align-items: center; gap: 10px; }
.avatar-crop-actions { flex: 0 0 auto; justify-content: flex-end; margin-left: auto; }
.crop-handle {
  position: absolute;
  width: 12px; height: 12px;
  background: #fff;
  border: 2px solid rgba(0,0,0,0.5);
  border-radius: 2px;
}
@media (max-width: 620px) {
  .avatar-crop-controls,
  .avatar-crop-footer { display: flex; flex-direction: column; align-items: stretch; }
  .avatar-crop-actions { justify-content: stretch; margin-left: 0; }
  .avatar-crop-actions .btn { flex: 1; }
}
</style>
`;
