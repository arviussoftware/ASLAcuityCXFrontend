import Link from "next/link";


const NotFound = ({ message, redirectUrl, redirectText }) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>404 - Page Not Found</h1>
      <p style={styles.message}>{message}</p>
      <img
        src="/astronaut.png"
        alt="404 Not Found"
        style={styles.image}
      />
      <Link href={redirectUrl}>
        <button style={styles.button}>
          {redirectText}
        </button>
      </Link>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginTop: '0px',
    padding: '20px',
    backgroundColor: '#f8f9fa',

  },
  header: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#dc3545',
  },
  message: {
    fontSize: '1.2rem',
    margin: '20px 0',
    color: '#495057',
  },
  image: {
    width: '300px',
    height: 'auto',
    margin: '20px 0',
    animation: 'bounce 2s infinite',
  },
  button: {
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: 'hsl(var(--primary))',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1rem',
    transition: 'background-color 0.3s',
  },
};

// Add hover effect for the button
const buttonHoverStyle = {
  backgroundColor: '#0056b3',
};

export default NotFound;
