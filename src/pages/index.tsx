import { useIntl, FormattedMessage } from '@umijs/max';
import { Card, Typography, Button, Space, Statistic, Row, Col, Divider } from 'antd';
import { useState } from 'react';
import {
  SmileOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import styles from './index.less';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const intl = useIntl();
  const [count, setCount] = useState(0);

  const features = [
    {
      icon: <SmileOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: intl.formatMessage({ id: 'demo.features.antd' }),
    },
    {
      icon: <GlobalOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: intl.formatMessage({ id: 'demo.features.i18n' }),
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      title: intl.formatMessage({ id: 'demo.features.vite' }),
    },
    {
      icon: <ApartmentOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: intl.formatMessage({ id: 'demo.features.routing' }),
    },
  ];

  return (
    <div className={styles.container}>
      <Card className={styles.heroCard}>
        <Title level={2} className={styles.title}>
          <FormattedMessage id="demo.title" />
        </Title>
        <Paragraph className={styles.description}>
          <FormattedMessage id="demo.description" />
        </Paragraph>
      </Card>

      <Divider>
        <FormattedMessage id="demo.features" />
      </Divider>

      <Row gutter={[16, 16]} className={styles.featuresRow}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card hoverable className={styles.featureCard}>
              <div className={styles.featureContent}>
                {feature.icon}
                <Paragraph className={styles.featureTitle}>{feature.title}</Paragraph>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider>
        <FormattedMessage id="demo.counter" />
      </Divider>

      <Card className={styles.counterCard}>
        <Row justify="center" align="middle" gutter={24}>
          <Col>
            <Statistic
              title={<FormattedMessage id="demo.counter" />}
              value={count}
              valueStyle={{ fontSize: 48, fontWeight: 'bold' }}
            />
          </Col>
        </Row>
        <Row justify="center" style={{ marginTop: 24 }}>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={() => setCount((c) => c + 1)}
            >
              <FormattedMessage id="demo.increment" />
            </Button>
            <Button
              size="large"
              onClick={() => setCount((c) => c - 1)}
            >
              <FormattedMessage id="demo.decrement" />
            </Button>
          </Space>
        </Row>
      </Card>
    </div>
  );
}
