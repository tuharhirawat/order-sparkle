namespace MamtasImitationJewelleryBE.Exceptions
{
    public class OrderValidationException : Exception
    {
        public OrderValidationException(string message) : base(message) { }
    }
    
    public class TooManyOrderRequestsException : Exception
    {
        public TooManyOrderRequestsException(string message) : base(message) { }
    }
    
    public class ProfileNotFoundException : Exception
    {
        public ProfileNotFoundException(string message) : base(message) { }
    }
    
    public class OrderNotFoundException : Exception
    {
        public OrderNotFoundException(string message) : base(message) { }
    }
}
