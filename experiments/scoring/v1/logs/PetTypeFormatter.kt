import org.springframework.format.Formatter
import org.springframework.stereotype.Component

@Component
class PetTypeFormatter(private val types: PetTypeRepository)

    override fun print(petType: PetType, locale: Locale): String {
        return petType.name
    }

    override fun parse(text: String, locale: Locale): PetType {
        for (type in this.types.findAll()) {
            if (type.name == text) {
                return type
            }
        }
        throw ParseException("type not found: $text", 0)
    }