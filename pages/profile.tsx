import React, { useState, useEffect } from 'react';
import { Container, Title, Paper, TextInput, Button, Group, Select, Box, Text, ActionIcon, Modal, Flex, Stack, FileButton, Avatar } from '@mantine/core';
import { useAuth } from '../components/Auth/AuthContext';
import { showAppNotification } from '../components/NotificationDisplay';
import { useRouter } from 'next/router';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';

interface UserAiModel {
  id: number;
  model_name: string;
  provider: string;
}

export default function ProfilePage() {
  const { isAuthenticated, token, aiModel, aiApiKey, avatarUrl, aiProvider, userAiModels, updateAiSettings, updateAvatarUrl, fetchUserAiModels } = useAuth();
  const router = useRouter();

  const [currentAiModel, setCurrentAiModel] = useState<string | null>(aiModel);
  const [currentAiApiKey, setCurrentAiApiKey] = useState<string | null>(aiApiKey);
  
  const [currentAiProvider, setCurrentAiProvider] = useState<string | null>(aiProvider);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);

  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newProvider, setNewProvider] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<UserAiModel | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setCurrentAiModel(aiModel);
    setCurrentAiApiKey(aiApiKey);
    
    setCurrentAiProvider(aiProvider);
  }, [aiModel, aiApiKey, avatarUrl, aiProvider]);

  const handleAvatarUpload = async () => {
    if (!avatarFile) {return};
    setLoading(true);
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const response = await fetch('/api/uploadAvatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        updateAvatarUrl(`${data.avatarUrl}?t=${Date.now()}`);
        setAvatarFile(null);
        setPreviewAvatarUrl(null);
        showAppNotification({
          title: '成功',
          message: '头像上传成功！',
          c: 'green',
        });
      } else {
        showAppNotification({
          title: '错误',
          message: data.error || '上传失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Error uploading avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaultAiSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/updateUserProfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ai_model: currentAiModel, ai_api_key: currentAiApiKey, ai_provider: currentAiProvider }),
      });

      const data = await response.json();

      if (response.ok) {
        updateAiSettings(currentAiModel || '', currentAiApiKey || '', currentAiProvider || '');
        
        showAppNotification({
          title: '成功',
          message: '默认AI设置和头像已更新！',
          c: 'green',
        });
      } else {
        showAppNotification({
          title: '错误',
          message: data.error || '更新失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAiModel = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/userAiModels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ model_name: newModelName, api_key: newApiKey, provider: newProvider }),
      });

      const data = await response.json();

      if (response.ok) {
        showAppNotification({
          title: '成功',
          message: 'AI模型添加成功！',
          c: 'green',
        });
        setAddModalOpened(false);
        setNewModelName('');
        setNewApiKey('');
        setNewProvider(null);
        fetchUserAiModels(); // Refresh the list of models
      } else {
        showAppNotification({
          title: '错误',
          message: data.error || '添加AI模型失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Error adding AI model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAiModel = async () => {
    if (!editingModel) {return};
    setLoading(true);
    try {
      const response = await fetch('/api/userAiModels', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingModel.id, model_name: newModelName, api_key: newApiKey, provider: newProvider }),
      });

      const data = await response.json();

      if (response.ok) {
        showAppNotification({
          title: '成功',
          message: 'AI模型更新成功！',
          c: 'green',
        });
        setEditModalOpened(false);
        setNewModelName('');
        setNewApiKey('');
        setNewProvider(null);
        setEditingModel(null);
        fetchUserAiModels(); // Refresh the list of models
      } else {
        showAppNotification({
          title: '错误',
          message: data.error || '更新AI模型失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Error updating AI model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAiModel = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/userAiModels?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showAppNotification({
          title: '成功',
          message: 'AI模型删除成功！',
          c: 'green',
        });
        fetchUserAiModels(); // Refresh the list of models
      } else {
        const data = await response.json();
        showAppNotification({
          title: '错误',
          message: data.error || '删除AI模型失败',
          c: 'red',
        });
      }
    } catch (error) {
      showAppNotification({
        title: '错误',
        message: '网络错误或服务器无法访问',
        c: 'red',
      });
      console.error('Error deleting AI model:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <Container size="sm" my={40}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mt="md" mb={30} c="white">
          个人设置
        </Title>

        <Box mb="xl">
          <Title order={3} mb="md" c="white">头像设置</Title>
          <Group>
            <Avatar src={previewAvatarUrl || avatarUrl} size="xl" radius="xl" />
            <Stack>
              <FileButton onChange={(file) => {
                setAvatarFile(file);
                if (file) {
                  const objectUrl = URL.createObjectURL(file);
                  setPreviewAvatarUrl(objectUrl);
                } else {
                  setPreviewAvatarUrl(null);
                }
              }} accept="image/png,image/jpeg">
                {(props) => <Button {...props}>选择文件</Button>}
              </FileButton>
              <Button onClick={handleAvatarUpload} disabled={!avatarFile} loading={loading}>
                上传头像
              </Button>
            </Stack>
          </Group>
        </Box>

        <Box mb="xl">
          <Title order={3} mb="md" c="white">默认AI模型设置</Title>
          <Select
            label="默认AI模型"
            placeholder="选择你偏好的默认AI模型"
            data={[
              { value: 'deepseek-chat', label: 'DeepSeek Chat' },
              { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
              { value: 'gpt-4', label: 'GPT-4' },
              { value: 'glm-4', label: 'GLM-4 (智谱AI)' },
              { value: 'qwen-turbo', label: 'Qwen-Turbo (通义千问)' },
              { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
              { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
              { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
            ]}
            value={currentAiModel}
            onChange={(value) => {
              setCurrentAiModel(value);
              // Automatically set provider based on selected model
              if (value) {
                if (value.startsWith('gpt')) {
                  setCurrentAiProvider('openai');
                } else if (value.startsWith('deepseek')) {
                  setCurrentAiProvider('deepseek');
                } else if (value.startsWith('glm')) {
                  setCurrentAiProvider('zhipuai');
                } else if (value.startsWith('qwen')) {
                  setCurrentAiProvider('aliyun');
                } else if (value.startsWith('claude')) {
                  setCurrentAiProvider('anthropic');
                } else {
                  setCurrentAiProvider(null); // Clear if unknown
                }
              }
            }}
            mb="md"
          />

          <Select
            label="默认AI提供商"
            placeholder="选择你偏好的默认AI提供商"
            data={[
              { value: 'openai', label: 'OpenAI' },
              { value: 'deepseek', label: 'DeepSeek' },
              { value: 'zhipuai', label: '智谱AI (GLM)' },
              { value: 'aliyun', label: '阿里云 (通义千问)' },
              { value: 'anthropic', label: 'Anthropic (Claude)' },
            ]}
            value={currentAiProvider}
            onChange={setCurrentAiProvider}
            mb="md"
          />

          <TextInput
            label="默认AI API Key"
            placeholder="输入你的默认AI API Key"
            value={currentAiApiKey || ''}
            onChange={(event) => setCurrentAiApiKey(event.currentTarget.value)}
            mb="md"
          />

          

          <Group justify="flex-end" mt="md">
            <Button onClick={handleSaveDefaultAiSettings} loading={loading}>
              保存默认设置
            </Button>
          </Group>
        </Box>

        <Box mb="xl">
          <Flex justify="space-between" align="center" mb="md">
            <Title order={3} c="white">我的AI模型配置</Title>
            <ActionIcon variant="filled" color="blue" size="lg" onClick={() => setAddModalOpened(true)}>
              <IconPlus size={20} />
            </ActionIcon>
          </Flex>

          {userAiModels.length === 0 ? (
            <Text c="dimmed">你还没有配置任何AI模型。点击上方加号添加。</Text>
          ) : (
            <Stack>
              {userAiModels.map((model) => (
                <Paper key={model.id} withBorder p="md" shadow="sm">
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text fw={500} c="white">{model.model_name} ({model.provider})</Text>
                    </Box>
                    <Group gap="xs">
                      <ActionIcon variant="light" color="blue" onClick={() => {
                        setEditingModel(model);
                        setNewModelName(model.model_name);
                        setNewProvider(model.provider);
                        // Note: API Key is not returned from backend for security, so it won't be pre-filled
                        setNewApiKey(''); 
                        setEditModalOpened(true);
                      }}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="red" onClick={() => handleDeleteAiModel(model.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Add New Model Modal */}
      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="添加新的AI模型" centered>
        <TextInput
          label="模型名称"
          placeholder="例如：gpt-4, deepseek-chat"
          value={newModelName}
          onChange={(event) => setNewModelName(event.currentTarget.value)}
          mb="md"
        />
        <TextInput
          label="API Key"
          placeholder="输入模型的API Key"
          value={newApiKey}
          onChange={(event) => setNewApiKey(event.currentTarget.value)}
          mb="md"
        />
        <Select
          label="提供商"
          placeholder="选择模型提供商"
          data={[
            { value: 'openai', label: 'OpenAI' },
            { value: 'deepseek', label: 'DeepSeek' },
            { value: 'zhipuai', label: '智谱AI (GLM)' },
            { value: 'aliyun', label: '阿里云 (通义千问)' },
            { value: 'anthropic', label: 'Anthropic (Claude)' },
          ]}
          value={newProvider}
          onChange={setNewProvider}
          mb="md"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setAddModalOpened(false)}>取消</Button>
          <Button onClick={handleAddAiModel} loading={loading}>添加</Button>
        </Group>
      </Modal>

      {/* Edit Model Modal */}
      <Modal opened={editModalOpened} onClose={() => setEditModalOpened(false)} title="编辑AI模型" centered>
        <TextInput
          label="模型名称"
          placeholder="例如：gpt-4, deepseek-chat"
          value={newModelName}
          onChange={(event) => setNewModelName(event.currentTarget.value)}
          mb="md"
        />
        <TextInput
          label="API Key"
          placeholder="输入模型的API Key (留空则不修改)"
          value={newApiKey}
          onChange={(event) => setNewApiKey(event.currentTarget.value)}
          mb="md"
        />
        <Select
          label="提供商"
          placeholder="选择模型提供商"
          data={[
            { value: 'openai', label: 'OpenAI' },
            { value: 'deepseek', label: 'DeepSeek' },
            { value: 'zhipuai', label: '智谱AI (GLM)' },
            { value: 'aliyun', label: '阿里云 (通义千问)' },
            { value: 'anthropic', label: 'Anthropic (Claude)' },
          ]}
          value={newProvider}
          onChange={setNewProvider}
          mb="md"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setEditModalOpened(false)}>取消</Button>
          <Button onClick={handleEditAiModel} loading={loading}>保存</Button>
        </Group>
      </Modal>
    </Container>
  );
}
